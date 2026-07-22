import type { HomeAssistant } from 'preact-homeassistant';
import { useCallbackStable } from 'preact-homeassistant';
import { useState } from 'preact/hooks';
import type { DisplayTimerConfig } from './DisplayTimer';

interface EditorProps {
  hass: HomeAssistant;
  config: DisplayTimerConfig;
  onConfigChanged: (config: DisplayTimerConfig) => void;
}

// HA's <ha-form> renders the right control per field and themes it. The entity
// selector scoped to `timer` gives a searchable list of the existing timer
// helpers for free.
const SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: 'timer' } } },
  { name: 'presets', selector: { text: {} } },
] as const;

const LABELS: Record<string, string> = {
  entity: 'Timer entity',
  presets: 'Preset minutes (comma-separated)',
};

/** Mirror HA's entity_id derivation for a new helper (used as a fallback). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function DisplayTimerEditor({ hass, config, onConfigChanged }: EditorProps) {
  const handleValueChanged = useCallbackStable((e: Event) => {
    const next = (e as CustomEvent).detail?.value as Partial<DisplayTimerConfig> | undefined;
    if (!next) return;
    onConfigChanged({ ...config, ...next });
  });

  const computeLabel = useCallbackStable(
    (schema: { name: string }) => LABELS[schema.name] ?? schema.name,
  );

  // Only admins can create helpers. `user` isn't on the library's typed hass
  // subset, but the real object HA passes carries it.
  const isAdmin = Boolean((hass as unknown as { user?: { is_admin?: boolean } }).user?.is_admin);

  const [newName, setNewName] = useState('');
  const [newMinutes, setNewMinutes] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTimer = useCallbackStable(async () => {
    const name = newName.trim();
    const minutes = Number(newMinutes);
    if (!name || !Number.isFinite(minutes) || minutes <= 0) {
      setError('Enter a name and a positive number of minutes.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = (await hass.connection.sendMessagePromise({
        type: 'timer/create',
        name,
        duration: { minutes },
      })) as { id?: string };
      const entity = result?.id ? `timer.${result.id}` : `timer.${slugify(name)}`;
      onConfigChanged({ ...config, entity });
      setNewName('');
    } catch (_err) {
      setError("Couldn't create the timer. Check your permissions and try again.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <div>
      <ha-form
        hass={hass}
        data={config}
        schema={SCHEMA}
        computeLabel={computeLabel}
        onvalue-changed={handleValueChanged}
      />

      {isAdmin ? (
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--divider-color,#e0e0e0);">
          <div style="font-weight:500;margin-bottom:8px;">Create a new timer helper</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <ha-textfield
              label="Name"
              value={newName}
              onInput={(e: Event) => setNewName((e.target as HTMLInputElement).value)}
            />
            <ha-textfield
              label="Minutes"
              type="number"
              value={newMinutes}
              onInput={(e: Event) => setNewMinutes((e.target as HTMLInputElement).value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={createTimer}
              style="min-height:48px;padding:0 20px;border:none;border-radius:8px;background:var(--primary-color,#3b82f6);color:var(--text-primary-color,#fff);font-size:1em;font-weight:600;cursor:pointer;"
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
          {error ? (
            <div style="color:var(--error-color,#db4437);margin-top:8px;">{error}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
