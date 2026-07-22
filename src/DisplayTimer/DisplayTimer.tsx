import { HACard, getAllStyles, useEntity, useService } from 'preact-homeassistant';
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import './DisplayTimer.styles';

export interface DisplayTimerConfig {
  entity: string;
  /** Comma-separated preset lengths in minutes, e.g. "15,30,45". */
  presets?: string;
}

// How long the "time's up" flash stays before collapsing on its own.
const DONE_TIMEOUT_MS = 60_000;

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

/** Seconds -> "M:SS" (minutes may exceed 59). */
function formatMMSS(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  done: boolean;
  paused: boolean;
  remainingSec: number;
  fraction: number;
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
  done,
  paused,
  remainingSec,
  fraction,
  onPause,
  onResume,
  onCancel,
  onMinimize,
  onDismissDone,
}: OverlayProps) {
  const dashoffset = RING_C * (1 - Math.max(0, Math.min(1, fraction)));

  return (
    <div
      class={`display-timer-overlay${done ? ' is-done' : ''}`}
      // When flashing, a tap anywhere collapses back to the widget.
      onPointerDown={done ? onDismissDone : undefined}
    >
      <div class="display-timer-overlay__dial">
        <svg class="display-timer-overlay__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="display-timer-overlay__track" cx="50" cy="50" r={RING_R} />
          <circle
            class="display-timer-overlay__progress"
            cx="50"
            cy="50"
            r={RING_R}
            stroke-dasharray={RING_C}
            stroke-dashoffset={dashoffset}
          />
        </svg>
        <div class="display-timer-overlay__time">{done ? '0:00' : formatMMSS(remainingSec)}</div>
      </div>

      {done ? (
        <div class="display-timer-overlay__done-label">Time's up!</div>
      ) : (
        <div class="display-timer-overlay__controls">
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
        </div>
      )}
    </div>
  );
}

export function DisplayTimer({ config }: { config: DisplayTimerConfig }) {
  const entity = useEntity(config.entity);
  const svc = useService(config.entity);
  const presets = parsePresets(config.presets);

  const state = entity?.state; // 'idle' | 'active' | 'paused'
  const active = state === 'active';
  const paused = state === 'paused';
  const finishesAt = entity?.attributes?.finishes_at as string | undefined;

  // Local clock — HA doesn't tick the countdown, so we compute remaining time
  // client-side against `finishes_at`. Only runs while active.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, finishesAt]);

  const totalSec = parseHMS(entity?.attributes?.duration as string | undefined);
  let remainingSec = 0;
  if (active && finishesAt) {
    remainingSec = Math.max(0, (Date.parse(finishesAt) - now) / 1000);
  } else if (paused) {
    remainingSec = parseHMS(entity?.attributes?.remaining as string | undefined);
  }
  const fraction = totalSec > 0 ? remainingSec / totalSec : 0;

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

  if (!config.entity) {
    return (
      <HACard>
        <div class="card-content display-timer__empty">
          No timer configured. Pick one in the card editor.
        </div>
      </HACard>
    );
  }

  if (!entity) {
    return (
      <HACard>
        <div class="card-content display-timer__empty">
          Waiting for <code>{config.entity}</code>...
        </div>
      </HACard>
    );
  }

  const name = (entity.attributes?.friendly_name as string | undefined) ?? config.entity;
  const running = active || paused;
  const showOverlay = open && (running || done);

  return (
    <HACard align="top">
      <div class="card-content display-timer">
        <h2 class="display-timer__heading">{name}</h2>

        {running ? (
          <button
            type="button"
            class="display-timer__mini"
            onClick={() => setOpen(true)}
            aria-label="Expand timer"
          >
            <span class="display-timer__mini-time">{formatMMSS(remainingSec)}</span>
            <span class="display-timer__mini-hint">
              {paused ? 'Paused · tap' : 'tap to expand'}
            </span>
          </button>
        ) : (
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
        )}
      </div>

      {showOverlay && typeof document !== 'undefined'
        ? createPortal(
            <>
              <style>{getAllStyles()}</style>
              <TimerOverlay
                done={done}
                paused={paused}
                remainingSec={remainingSec}
                fraction={fraction}
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
            document.body,
          )
        : null}
    </HACard>
  );
}
