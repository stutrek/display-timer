import type { ComponentChildren } from 'preact';
import { HACard, getAllStyles, useEntity, useService, useWidth } from 'preact-homeassistant';
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import './DisplayTimer.styles';

export interface DisplayTimerConfig {
  entity: string;
  /** Optional title shown above the widget. Blank/omitted = no title. */
  name?: string;
  /** Comma-separated preset lengths in minutes, e.g. "15,30,45". */
  presets?: string;
}

// How long the "time's up" flash stays before collapsing on its own.
const DONE_TIMEOUT_MS = 60_000;

// Walk the whole (shadow-piercing) DOM for a selector. HA nests everything in
// shadow roots, so a plain querySelector won't reach the dashboard internals.
function findDeep(selector: string): Element | null {
  function search(root: Document | ShadowRoot): Element | null {
    const found = root.querySelector(selector);
    if (found) return found;
    for (const el of root.querySelectorAll('*')) {
      const sr = (el as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
      if (sr) {
        const r = search(sr);
        if (r) return r;
      }
    }
    return null;
  }
  return search(document);
}

// The dashboard content region (excludes HA's header/sidebar). Scoping the
// overlay here — instead of the whole viewport — keeps it out of the way of
// HA chrome and the fullscreen-dashboard button, and lets it ride along when
// that button puts the dashboard into real fullscreen.
function findViewContainer(): Element | null {
  return findDeep('hui-view-container');
}

// SVG ring geometry (viewBox is 100x100).
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

/** Parse an "H:MM:SS" (or "MM:SS") HA duration into seconds. */
function parseHMS(value?: string): number {
  if (!value) return 0;
  const parts = value.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Minutes -> "HH:MM:SS" for timer.start. */
function mmToHHMMSS(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Format the countdown. With minutes remaining it's "M:SS" (seconds padded,
 * minutes may exceed 59). With zero minutes there's no "0:" prefix and no
 * leading zero on the seconds — "45", "9", "0".
 */
function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

function parsePresets(csv?: string): number[] {
  const src = csv?.trim() ? csv : '15,30,45';
  const nums = src
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums : [15, 30, 45];
}

interface OverlayProps {
  /**
   * The HA dashboard content container to pin geometry to (measured, not
   * rendered into — the overlay itself lives in a body-owned host). We
   * `position: fixed` the overlay to this element's visible on-screen rect so
   * it fills only the dashboard area, never taller than the screen. When null
   * (Storybook/tests, or no HA container found) we fall back to the viewport.
   */
  viewContainer: Element | null;
  active: boolean;
  done: boolean;
  paused: boolean;
  remainingSec: number;
  totalSec: number;
  finishesAt: string | undefined;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onMinimize: () => void;
  onDismissDone: () => void;
}

// The fullscreen takeover. Rendered via a portal into document.body (see the
// "Shadow DOM gotcha" in the writing-cards skill): a position:fixed element
// inside the card's shadow root gets clipped/stacked by HA's dashboard layout,
// so we escape to the body and inject the registered css`` styles alongside it.
function TimerOverlay({
  viewContainer,
  active,
  done,
  paused,
  remainingSec,
  totalSec,
  finishesAt,
  onPause,
  onResume,
  onCancel,
  onMinimize,
  onDismissDone,
}: OverlayProps) {
  const scoped = viewContainer instanceof HTMLElement;
  const isViewport = !scoped;

  // The ring is animated by CSS, not by per-second JS updates. On each run
  // (start/resume) we set stroke-dashoffset ONCE to animate from the current
  // fraction to empty over the entire remaining time with a single linear
  // transition — the browser then renders it smoothly frame-by-frame. Driving
  // it off finishes_at (not the 1s clock) is what removes the per-second jump.
  const progressRef = useRef<SVGCircleElement>(null);
  useLayoutEffect(() => {
    const c = progressRef.current;
    if (!c) return;
    const clamp = (f: number) => Math.max(0, Math.min(1, f));

    if (active && finishesAt) {
      const remMs = Date.parse(finishesAt) - Date.now();
      const startFrac = totalSec > 0 ? clamp(remMs / 1000 / totalSec) : 0;
      // Jump (no transition) to the true current position, commit it...
      c.style.transition = 'none';
      c.style.strokeDashoffset = String(RING_C * (1 - startFrac));
      void c.getBoundingClientRect();
      // ...then animate to empty over exactly the time that remains.
      if (remMs > 0) {
        c.style.transition = `stroke-dashoffset ${remMs}ms linear`;
        c.style.strokeDashoffset = String(RING_C);
      }
      return;
    }

    // Paused or done: freeze the ring where it is (no animation).
    const frac = done ? 0 : totalSec > 0 ? clamp(remainingSec / totalSec) : 0;
    c.style.transition = 'none';
    c.style.strokeDashoffset = String(RING_C * (1 - frac));
    // Deps are per-run only — remainingSec is deliberately not included, so
    // this doesn't re-fire (and restart the animation) every second.
  }, [active, done, paused, finishesAt, totalSec]);

  // Pin the fixed overlay to the dashboard container's visible rect, and drive
  // the countdown/ring size off the smaller side via a --dt-min custom property
  // (no container queries — this must work back to older Safari/iOS).
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || typeof window === 'undefined') return;
    const apply = () => {
      let w: number;
      let h: number;
      if (scoped && viewContainer instanceof HTMLElement) {
        // Clamp to the intersection of the container and the viewport. The
        // container can be far taller than the screen (a scrolling dashboard),
        // so using its full rect would make the overlay overflow the screen.
        const r = viewContainer.getBoundingClientRect();
        const top = Math.max(r.top, 0);
        const left = Math.max(r.left, 0);
        w = Math.max(0, Math.min(r.right, window.innerWidth) - left);
        h = Math.max(0, Math.min(r.bottom, window.innerHeight) - top);
        el.style.top = `${top}px`;
        el.style.left = `${left}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      } else {
        w = window.innerWidth;
        h = window.innerHeight;
      }
      el.style.setProperty('--dt-min', `${Math.min(w, h)}px`);
    };
    apply();
    let ro: ResizeObserver | undefined;
    if (scoped && viewContainer instanceof HTMLElement && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(apply);
      ro.observe(viewContainer);
    }
    window.addEventListener('resize', apply);
    window.addEventListener('scroll', apply, true);
    document.addEventListener('fullscreenchange', apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('scroll', apply, true);
      document.removeEventListener('fullscreenchange', apply);
    };
  }, [viewContainer, scoped]);

  return (
    <div
      ref={rootRef}
      class={`display-timer-overlay${isViewport ? ' display-timer-overlay--viewport' : ''}${done ? ' is-done' : ''}`}
      // When flashing, a tap anywhere collapses back to the widget.
      onPointerDown={done ? onDismissDone : undefined}
    >
      <div class="display-timer-overlay__dial">
        <svg class="display-timer-overlay__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="display-timer-overlay__track" cx="50" cy="50" r={RING_R} />
          <circle
            ref={progressRef}
            class="display-timer-overlay__progress"
            cx="50"
            cy="50"
            r={RING_R}
            stroke-dasharray={RING_C}
          />
        </svg>
        <div class="display-timer-overlay__time">{formatCountdown(done ? 0 : remainingSec)}</div>
      </div>

      {/* Same controls container in both states so the "done" swap doesn't
          shift the layout. */}
      <div class="display-timer-overlay__controls">
        {done ? (
          <button type="button" class="display-timer-overlay__btn" onClick={onDismissDone}>
            Dismiss
          </button>
        ) : (
          <>
            <button
              type="button"
              class="display-timer-overlay__btn"
              onClick={paused ? onResume : onPause}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              class="display-timer-overlay__btn display-timer-overlay__btn--cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="button" class="display-timer-overlay__btn" onClick={onMinimize}>
              Minimize
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function DisplayTimer({ config }: { config: DisplayTimerConfig }) {
  const entity = useEntity(config.entity);
  const svc = useService(config.entity);
  const presets = parsePresets(config.presets);

  // Measure the card width in JS (not a container query) so this works on
  // older Safari/iOS. Below the threshold we drop the widget padding.
  const cardRef = useRef<HTMLDivElement>(null);
  const cardWidth = useWidth(cardRef);
  const tight = cardWidth !== undefined && cardWidth <= 220;

  const state = entity?.state; // 'idle' | 'active' | 'paused'
  console.log('DisplayTimer state:', state, 'entity:', entity);
  const active = state === 'active';
  const paused = state === 'paused';
  const finishesAt = entity?.attributes?.finishes_at as string | undefined;

  // Local clock — HA doesn't tick the countdown, so we compute remaining time
  // client-side against `finishes_at`. Only runs while active. Rather than a
  // fixed 1s interval (which drifts, so the displayed second lags), each tick
  // reschedules for the exact moment the displayed second next flips: the ms
  // until the next 1000ms boundary of the remaining time, plus a 10ms cushion
  // so ceil() has definitely rolled over by the time we re-render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || !finishesAt) return;
    const target = Date.parse(finishesAt);
    if (Number.isNaN(target)) return;
    let timeoutId = 0;
    const tick = () => {
      setNow(Date.now());
      const delta = target - Date.now();
      if (delta <= 0) return; // reached zero; no more ticks needed
      const msToNextSecond = delta % 1000 || 1000;
      timeoutId = window.setTimeout(tick, msToNextSecond + 10);
    };
    tick();
    return () => clearTimeout(timeoutId);
  }, [active, finishesAt]);

  const totalSec = parseHMS(entity?.attributes?.duration as string | undefined);
  let remainingSec = 0;
  if (active && finishesAt) {
    remainingSec = Math.max(0, (Date.parse(finishesAt) - now) / 1000);
  } else if (paused) {
    remainingSec = parseHMS(entity?.attributes?.remaining as string | undefined);
  }

  // Overlay state machine.
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const runKeyRef = useRef<string | undefined>(undefined);
  const prevStateRef = useRef<string | undefined>(undefined);

  // Auto-fullscreen on a new run (start/resume) — even if started elsewhere —
  // and distinguish a natural finish (flash) from a cancel (silent collapse).
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (state === 'active' && finishesAt && finishesAt !== runKeyRef.current) {
      runKeyRef.current = finishesAt;
      setDone(false);
      setOpen(true);
    }

    if (prev === 'active' && state === 'idle') {
      // HA flips the state to idle the moment the countdown ends — usually
      // before our 1s clock notices remaining <= 0. So decide finish-vs-cancel
      // by the clock, not by a locally-observed zero: if we've reached (or
      // passed) this run's finishes_at, it ran out naturally -> flash.
      const finishTs = runKeyRef.current ? Date.parse(runKeyRef.current) : 0;
      const finishedNaturally = finishTs > 0 && Date.now() >= finishTs - 1500;
      if (finishedNaturally) {
        setDone(true); // finished naturally -> flash
        setOpen(true);
      } else {
        setOpen(false); // cancelled -> collapse, no flash
        setDone(false);
      }
    }
  }, [state, finishesAt]);

  // Belt-and-suspenders: if HA is slow to flip to idle, trip the flash the
  // instant our own countdown reaches zero while still active.
  useEffect(() => {
    if (active && remainingSec <= 0) {
      setDone(true);
      setOpen(true);
    }
  }, [active, remainingSec]);

  // Collapse the flash after a minute if nobody touches it.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => {
      setDone(false);
      setOpen(false);
    }, DONE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [done]);

  const running = active || paused;
  // Only treat it as "counting" (mini widget / re-expandable) while time is
  // actually left. Once it hits zero the widget shows presets again instead of
  // a stuck "0:00 · tap to expand", even if HA lags on flipping to idle.
  const counting = running && remainingSec > 0;
  const showOverlay = open && (counting || done);

  // Render the overlay into ONE stable host <div>, never straight into HA's
  // hui-view-container. Portaling the Preact tree into that Lit element and
  // re-reconciling its children every second (the countdown text) corrupts
  // Lit's DOM, which detaches our card — HA then stops calling `set hass`, the
  // useEntity subscription is torn down, and the countdown freezes until reload.
  // Preact only ever mutates INSIDE this host, so its parent sees an unchanging
  // child. We park the host in <body> normally, but move it inside the
  // OS-fullscreen element when the fullscreen-dashboard card has the dashboard
  // fullscreen (otherwise a body node isn't rendered over the fullscreen one).
  // Geometry is still pinned to the dashboard container's on-screen rect.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [viewContainer, setViewContainer] = useState<Element | null>(null);
  useEffect(() => {
    if (!showOverlay || typeof document === 'undefined') {
      setHost(null);
      setViewContainer(null);
      return;
    }
    const el = document.createElement('div');
    const place = () => {
      const target = document.fullscreenElement ?? document.body;
      if (el.parentNode !== target) target.appendChild(el);
    };
    place();
    document.addEventListener('fullscreenchange', place);
    setViewContainer(findViewContainer());
    setHost(el);
    return () => {
      document.removeEventListener('fullscreenchange', place);
      el.remove();
    };
  }, [showOverlay]);

  const title = config.name?.trim();

  // One stable outer structure across all states so the width-measuring ref
  // stays attached (an early return with different markup would detach it).
  let content: ComponentChildren;
  if (!config.entity) {
    content = (
      <div class="display-timer__empty">No timer configured. Pick one in the card editor.</div>
    );
  } else if (!entity) {
    content = (
      <div class="display-timer__empty">
        Waiting for <code>{config.entity}</code>...
      </div>
    );
  } else if (counting) {
    content = (
      <button
        type="button"
        class="display-timer__mini"
        onClick={() => setOpen(true)}
        aria-label="Expand timer"
      >
        <span class="display-timer__mini-time">{formatCountdown(remainingSec)}</span>
        <span class="display-timer__mini-hint">{paused ? 'Paused · tap' : 'tap to expand'}</span>
      </button>
    );
  } else {
    content = (
      <div class="display-timer__presets">
        {presets.map((min) => (
          <button
            type="button"
            key={min}
            class="display-timer__preset"
            onClick={() => svc('start', { duration: mmToHHMMSS(min) })}
          >
            {min}
            <span class="display-timer__preset-unit">min</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <HACard align="top">
      <div class={`display-timer${tight ? ' display-timer--tight' : ''}`} ref={cardRef}>
        <div class="display-timer__inner">
          {title && entity ? <h2 class="display-timer__heading">{title}</h2> : null}
          {content}
        </div>
      </div>

      {showOverlay && host
        ? createPortal(
            <>
              <style>{getAllStyles()}</style>
              <TimerOverlay
                viewContainer={viewContainer}
                active={active}
                done={done}
                paused={paused}
                remainingSec={remainingSec}
                totalSec={totalSec}
                finishesAt={finishesAt}
                onPause={() => svc('pause')}
                onResume={() => svc('start')}
                onCancel={() => {
                  setOpen(false);
                  setDone(false);
                  svc('cancel');
                }}
                onMinimize={() => setOpen(false)}
                onDismissDone={() => {
                  setDone(false);
                  setOpen(false);
                }}
              />
            </>,
            host,
          )
        : null}
    </HACard>
  );
}
