import { render, screen } from '@testing-library/preact';
import { HAProvider } from 'preact-homeassistant';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMockHass, noopSubscribe } from '../__test-utils__/mockHass';
import { __CardClass__ } from './__CardClass__';

describe('__CardClass__', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the entity name and state when configured', () => {
    const hass = createMockHass({
      entities: {
        'sensor.temperature': {
          entity_id: 'sensor.temperature',
          state: '72',
          attributes: {
            friendly_name: 'Living Room Temperature',
            unit_of_measurement: '°F',
          },
        },
      },
    });

    render(
      <HAProvider hass={hass} subscribeToEntity={noopSubscribe}>
        <__CardClass__ config={{ entity: 'sensor.temperature' }} />
      </HAProvider>,
    );

    expect(screen.getByText('Living Room Temperature')).toBeTruthy();
    expect(screen.getByText('sensor.temperature')).toBeTruthy();
    expect(screen.getByText(/72\s*°F/)).toBeTruthy();
  });

  it('shows a helpful message when no entity is configured', () => {
    const hass = createMockHass();

    render(
      <HAProvider hass={hass} subscribeToEntity={noopSubscribe}>
        <__CardClass__ config={{ entity: '' }} />
      </HAProvider>,
    );

    expect(screen.getByText(/No entity configured/)).toBeTruthy();
  });
});
