import { fireEvent, render, screen } from '@testing-library/preact';
import { HAProvider } from 'preact-homeassistant';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockHass, noopSubscribe } from '../__test-utils__/mockHass';
import { DisplayTimer } from './DisplayTimer';

const idleTimer = {
  'timer.game': {
    entity_id: 'timer.game',
    state: 'idle',
    attributes: { friendly_name: 'Game Time', duration: '0:00:00' },
  },
};

describe('DisplayTimer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows preset buttons for an idle timer', () => {
    const hass = createMockHass({ entities: idleTimer });

    render(
      <HAProvider hass={hass} subscribeToEntity={noopSubscribe}>
        <DisplayTimer config={{ entity: 'timer.game', presets: '15,30,45' }} />
      </HAProvider>,
    );

    expect(screen.getByText('Game Time')).toBeTruthy();
    expect(screen.getByRole('button', { name: /15/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /30/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /45/ })).toBeTruthy();
  });

  it('calls timer.start with the tapped preset duration', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const hass = createMockHass({ entities: idleTimer });
    hass.callService = callService;

    render(
      <HAProvider hass={hass} subscribeToEntity={noopSubscribe}>
        <DisplayTimer config={{ entity: 'timer.game', presets: '15,30,45' }} />
      </HAProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /30/ }));

    expect(callService).toHaveBeenCalledWith('timer', 'start', {
      entity_id: 'timer.game',
      duration: '00:30:00',
    });
  });

  it('shows a helpful message when no timer is configured', () => {
    const hass = createMockHass();

    render(
      <HAProvider hass={hass} subscribeToEntity={noopSubscribe}>
        <DisplayTimer config={{ entity: '' }} />
      </HAProvider>,
    );

    expect(screen.getByText(/No timer configured/)).toBeTruthy();
  });
});
