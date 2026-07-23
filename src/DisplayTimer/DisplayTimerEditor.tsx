import type { HomeAssistant } from 'preact-homeassistant';
import { useCallbackStable } from 'preact-homeassistant';
import type { DisplayTimerConfig } from './DisplayTimer';

interface EditorProps {
  hass: HomeAssistant;
  config: DisplayTimerConfig;
  onConfigChanged: (config: DisplayTimerConfig) => void;
}

// HA's <ha-form> renders the right control per field and themes it. The entity
// selector scoped to `timer` gives a searchable list of the existing timer
// helpers — and its dropdown already offers an "Add new timer" option, so no
// custom create UI is needed here.
const SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: 'timer' } } },
  { name: 'name', selector: { text: {} } },
  { name: 'presets', selector: { text: {} } },
] as const;

const LABELS: Record<string, string> = {
  entity: 'Timer entity',
  name: 'Title (optional)',
  presets: 'Preset minutes (comma-separated)',
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
