import { registerPreactCard } from 'preact-homeassistant';
import { DisplayTimer, type DisplayTimerConfig } from './DisplayTimer';
import { DisplayTimerEditor } from './DisplayTimerEditor';

registerPreactCard<DisplayTimerConfig>({
  type: 'display-timer',
  name: 'Display Timer',
  description: 'A starter card that displays a sensor entity and its attributes',
  Component: DisplayTimer,
  ConfigComponent: DisplayTimerEditor,
  getStubConfig: () => ({ entity: '' }),
});
