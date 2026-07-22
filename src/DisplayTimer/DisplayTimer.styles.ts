import { css } from 'preact-homeassistant';

// These styles are injected both into the card's shadow root (the widget) and,
// via the portal, globally into document.body (the overlay). Everything is
// namespaced under .display-timer / .display-timer-overlay so the global
// injection can't collide with Home Assistant's own DOM.
css`
  .display-timer {
    padding: 16px;
    font-family: var(--primary-font-family, Roboto, system-ui, sans-serif);
  }

  .display-timer__heading {
    font-size: 1.1em;
    font-weight: 600;
    margin: 0 0 12px;
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
    flex: 1 1 0;
    min-width: 72px;
    min-height: 64px;
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
    font-size: 1.6em;
    font-weight: 600;
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
  .display-timer-overlay {
    position: fixed;
    inset: 0;
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

  .display-timer-overlay__dial {
    position: relative;
    width: min(78vw, 62vh);
    height: min(78vw, 62vh);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .display-timer-overlay__ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Start the arc at 12 o'clock. */
    transform: rotate(-90deg);
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
    transition: stroke-dashoffset 1s linear;
  }

  .display-timer-overlay__time {
    position: relative;
    font-size: min(26vw, 20vh);
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

  .display-timer-overlay__done-label {
    font-size: min(9vw, 7vh);
    font-weight: 700;
  }

  /* ---- time's-up flash ---- */
  @keyframes display-timer-flash {
    0%,
    49% {
      background: var(--error-color, #db4437);
      color: #fff;
    }
    50%,
    100% {
      background: var(--card-background-color, #101014);
      color: var(--error-color, #db4437);
    }
  }

  .display-timer-overlay.is-done {
    cursor: pointer;
    /* Hard strobe: hold red, jump to dark at the midpoint, repeat. */
    animation: display-timer-flash 0.9s linear infinite;
  }

  .display-timer-overlay.is-done .display-timer-overlay__progress {
    stroke: currentColor;
  }

  @media (prefers-reduced-motion: reduce) {
    .display-timer-overlay.is-done {
      animation: none;
      background: var(--error-color, #db4437);
      color: #fff;
    }
    .display-timer-overlay__progress {
      transition: none;
    }
  }
`;
