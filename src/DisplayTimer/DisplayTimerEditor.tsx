import type { HomeAssistant } from 'preact-homeassistant';
import { useCallbackStable } from 'preact-homeassistant';
import type { DisplayTimerConfig } from './DisplayTimer';

interface EditorProps {
  hass: HomeAssistant;
  config: DisplayTimerConfig;
  onConfigChanged: (config: DisplayTimerConfig) => void;
}

// Use HA's modern <ha-form> with selectors. HA renders the right control for
// each field (entity picker, text input, number, boolean, etc.) and themes
// them consistently. Avoid the older <ha-select> + <ha-list-item> pattern —
// HA replaced ha-select's internals (ha-dropdown / wa-popup) and arbitrary
// list-item children no longer participate in selection.
//
// To add fields, extend SCHEMA. Selector reference:
//   https://www.home-assistant.io/docs/blueprint/selectors/
const SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: 'sensor' } } },
] as const;

const LABELS: Record<string, string> = {
  entity: 'Sensor entity',
};

export function DisplayTimerEditor({ hass, config, onConfigChanged }: EditorProps) {
  const handleValueChanged = useCallbackStable((e: Event) => {
    const next = (e as CustomEvent).detail?.value as Partial<DisplayTimerConfig> | undefined;
    if (!next) return;
    onConfigChanged({ ...config, ...next });
  });

  const computeLabel = useCallbackStable(
    (schema: { name: string }) => LABELS[schema.name] ?? schema.name,
  );

  return (
    <ha-form
      hass={hass}
      data={config}
      schema={SCHEMA}
      computeLabel={computeLabel}
      onvalue-changed={handleValueChanged}
    />
  );
}
