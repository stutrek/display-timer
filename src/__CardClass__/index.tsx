import { registerPreactCard } from 'preact-homeassistant';
import { __CardClass__, type __CardClass__Config } from './__CardClass__';
import { __CardClass__Editor } from './__CardClass__Editor';

registerPreactCard<__CardClass__Config>({
  type: '__CARD_TAG__',
  name: '__CARD_NAME__',
  description: 'A starter card that displays a sensor entity and its attributes',
  Component: __CardClass__,
  ConfigComponent: __CardClass__Editor,
  getStubConfig: () => ({ entity: '' }),
});
