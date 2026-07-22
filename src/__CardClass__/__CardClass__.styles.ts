import { css } from 'preact-homeassistant';

css`
  .__CARD_TAG__ {
    padding: 16px;
    font-family: var(--primary-font-family, sans-serif);
  }

  .__CARD_TAG____heading {
    font-size: 1.1em;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--primary-text-color, inherit);
  }

  .__CARD_TAG____entity-id {
    font-size: 0.85em;
    color: var(--secondary-text-color, #888);
    margin: 0 0 12px;
  }

  .__CARD_TAG____state {
    font-size: 1.6em;
    font-weight: 500;
    margin: 0 0 12px;
    color: var(--primary-text-color, inherit);
  }

  .__CARD_TAG____attributes {
    font-family: var(--code-font-family, 'SF Mono', Menlo, monospace);
    font-size: 0.8em;
    line-height: 1.4;
    background: var(--card-background-color, rgba(0, 0, 0, 0.2));
    padding: 8px 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0;
    color: var(--primary-text-color, inherit);
  }

  .__CARD_TAG____empty {
    padding: 16px;
    color: var(--secondary-text-color, #888);
    font-style: italic;
  }
`;
