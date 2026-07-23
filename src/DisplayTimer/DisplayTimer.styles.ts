import { css } from 'preact-homeassistant';

// These styles are injected both into the card's shadow root (the widget) and,
// via the portal, globally into document.body (the overlay). Everything is
// namespaced under .display-timer / .display-timer-overlay so the global
// injection can't collide with Home Assistant's own DOM.
css`
  .display-timer {
    font-family: var(--primary-font-family, Roboto, system-ui, sans-serif);
  }

  .display-timer__inner {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  /* Tight / one-button-wide (width toggled in JS): drop the padding so the
     buttons fill the card. A JS class, not a container query, for older iOS. */
  .display-timer--tight .display-timer__inner {
    padding: 0;
    gap: 6px;
  }

  .display-timer__heading {
    font-size: 1.1em;
    font-weight: 600;
    margin: 0;
    color: var(--primary-text-color, inherit);
  }

  .display-timer__empty {
    padding: 16px;
    color: var(--secondary-text-color, #888);
    font-style: italic;
  }

  /* ---- idle widget: preset buttons ---- */
  .display-timer__presets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .display-timer__preset {
    flex: 1 1 56px;
    min-width: 56px;
    min-height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: none;
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--primary-color, #3b82f6);
    color: var(--text-primary-color, #fff);
    font-family: inherit;
    font-size: clamp(1.1rem, 6vw, 1.7rem);
    font-weight: 600;
    line-height: 1.1;
    cursor: pointer;
    transition: filter 0.15s;
  }

  .display-timer__preset:hover {
    filter: brightness(1.08);
  }

  .display-timer__preset:focus-visible {
    outline: 3px solid var(--primary-text-color, #fff);
    outline-offset: 2px;
  }

  .display-timer__preset-unit {
    font-size: 0.5em;
    font-weight: 500;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ---- running widget: minimized countdown ---- */
  .display-timer__mini {
    display: flex;
    align-items: baseline;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    border: none;
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    color: var(--primary-text-color, inherit);
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .display-timer__mini:focus-visible {
    outline: 3px solid var(--primary-color, #3b82f6);
    outline-offset: 2px;
  }

  .display-timer__mini-time {
    font-size: 2.2em;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .display-timer__mini-hint {
    font-size: 0.85em;
    color: var(--secondary-text-color, #888);
  }

  /* ---- fullscreen overlay ---- */
  /* Fixed positioning keeps it within the visible screen. When scoped to HA's
     dashboard container the JS pins top/left/width/height to that element's
     on-screen rect; --viewport (Storybook/tests) just fills the viewport.
     The JS also sets --dt-min to the overlay's smaller side so the dial +
     countdown size off it via calc() — no container queries, so it works back
     to older Safari/iOS. */
  .display-timer-overlay {
    position: fixed;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: min(6vh, 48px);
    padding: 5vmin;
    box-sizing: border-box;
    background: var(--card-background-color, #101014);
    color: var(--primary-text-color, #fff);
    font-family: var(--primary-font-family, Roboto, system-ui, sans-serif);
    -webkit-tap-highlight-color: transparent;
  }

  .display-timer-overlay--viewport {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .display-timer-overlay__dial {
    position: relative;
    /* 78% of the overlay's smaller dimension — always fits the screen. */
    width: calc(var(--dt-min, 300px) * 0.78);
    height: calc(var(--dt-min, 300px) * 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .display-timer-overlay__ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* Start at 12 o'clock and empty clockwise. rotate(-90deg) puts the arc's
       start at the top; scaleY(-1) mirrors vertically to reverse the SVG's
       default winding (so it depletes clockwise) while keeping the start on the
       vertical axis — i.e. still at the top. */
    transform: rotate(-90deg) scaleY(-1);
  }

  .display-timer-overlay__track {
    fill: none;
    stroke: var(--divider-color, rgba(255, 255, 255, 0.12));
    stroke-width: 6;
  }

  .display-timer-overlay__progress {
    fill: none;
    stroke: var(--primary-color, #3b82f6);
    stroke-width: 7;
    stroke-linecap: round;
    /* stroke-dashoffset + its transition are set imperatively in JS: one
       linear transition per run, spanning the whole remaining time. */
  }

  .display-timer-overlay__time {
    position: relative;
    /* ~20% of the overlay's short side (0.78 dial * 0.25) so MM:SS with double
       digits fits inside the ring. */
    font-size: calc(var(--dt-min, 300px) * 0.2);
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .display-timer-overlay__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }

  .display-timer-overlay__btn {
    min-width: 132px;
    min-height: 60px;
    padding: 0 28px;
    border: 2px solid var(--divider-color, rgba(255, 255, 255, 0.3));
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: 1.4em;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .display-timer-overlay__btn:hover {
    background: rgba(127, 127, 127, 0.18);
  }

  .display-timer-overlay__btn:focus-visible {
    outline: 3px solid var(--primary-color, #3b82f6);
    outline-offset: 2px;
  }

  .display-timer-overlay__btn--cancel {
    border-color: var(--error-color, #db4437);
    color: var(--error-color, #db4437);
  }

  /* ---- time's-up flash: black <-> white ---- */
  @keyframes display-timer-flash {
    0%,
    49% {
      background: #fff;
      color: #000;
    }
    50%,
    100% {
      background: #000;
      color: #fff;
    }
  }

  .display-timer-overlay.is-done {
    cursor: pointer;
    /* Hard strobe: hold white, jump to black at the midpoint, repeat. */
    animation: display-timer-flash 0.9s linear infinite;
  }

  .display-timer-overlay.is-done .display-timer-overlay__progress {
    stroke: currentColor;
  }

  @media (prefers-reduced-motion: reduce) {
    .display-timer-overlay.is-done {
      animation: none;
      background: #000;
      color: #fff;
    }
  }
`;
