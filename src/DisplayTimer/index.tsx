import { registerPreactCard } from 'preact-homeassistant';
import { DisplayTimer, type DisplayTimerConfig } from './DisplayTimer';
import { DisplayTimerEditor } from './DisplayTimerEditor';

registerPreactCard<DisplayTimerConfig>({
  type: 'display-timer',
  name: 'Display Timer',
  description:
    'A fullscreen countdown card for a timer helper — presets, progress ring, and a done-flash',
  Component: DisplayTimer,
  ConfigComponent: DisplayTimerEditor,
  getStubConfig: () => ({ entity: '', presets: '15,30,45' }),
});
