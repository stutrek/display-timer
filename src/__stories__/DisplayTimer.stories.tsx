import type { Meta, StoryObj } from '@storybook/preact-vite';
import { HAProvider, getAllStyles } from 'preact-homeassistant';
import { DisplayTimer, type DisplayTimerConfig } from '../DisplayTimer/DisplayTimer';
import { createMockHass, noopSubscribe } from '../__test-utils__/mockHass';
import '../__test-utils__/ha-stubs';

const meta: Meta<typeof DisplayTimer> = {
  title: 'DisplayTimer',
  component: DisplayTimer,
};

export default meta;
type Story = StoryObj<typeof DisplayTimer>;

// Inject the styles registered via the css`` helper. registerPreactCard does
// this automatically inside the shadow root in production; stories render
// outside that root, so we have to do it manually here. (The overlay also
// injects them again into document.body via its portal — that's expected.)
const wrap = (entities: Record<string, any>, config: DisplayTimerConfig) => {
  const hass = createMockHass({ entities });
  return (
    <HAProvider hass={hass} subscribeToEntity={noopSubscribe}>
      <style>{getAllStyles()}</style>
      <DisplayTimer config={config} />
    </HAProvider>
  );
};

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();

export const Idle: Story = {
  render: () =>
    wrap(
      {
        'timer.game': {
          entity_id: 'timer.game',
          state: 'idle',
          attributes: { friendly_name: 'Game Time', duration: '0:00:00' },
        },
      },
      { entity: 'timer.game', name: 'Game Time', presets: '15,30,45' },
    ),
};

export const Active: Story = {
  render: () =>
    wrap(
      {
        'timer.game': {
          entity_id: 'timer.game',
          state: 'active',
          attributes: {
            friendly_name: 'Game Time',
            duration: '0:30:00',
            remaining: '0:18:00',
            finishes_at: iso(18 * 60 * 1000),
          },
        },
      },
      { entity: 'timer.game', presets: '15,30,45' },
    ),
};

export const Paused: Story = {
  render: () =>
    wrap(
      {
        'timer.game': {
          entity_id: 'timer.game',
          state: 'paused',
          attributes: {
            friendly_name: 'Game Time',
            duration: '0:30:00',
            remaining: '0:12:34',
          },
        },
      },
      { entity: 'timer.game', name: 'Game Time', presets: '15,30,45' },
    ),
};

// A timer whose countdown has already elapsed trips the "time's up" flash.
export const Done: Story = {
  render: () =>
    wrap(
      {
        'timer.game': {
          entity_id: 'timer.game',
          state: 'active',
          attributes: {
            friendly_name: 'Game Time',
            duration: '0:30:00',
            remaining: '0:00:00',
            finishes_at: iso(-1000),
          },
        },
      },
      { entity: 'timer.game', presets: '15,30,45' },
    ),
};
