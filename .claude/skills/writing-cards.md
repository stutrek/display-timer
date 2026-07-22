---
name: writing-cards
description: Patterns and conventions for building Home Assistant cards with preact-homeassistant. Trigger when adding a new card, a new widget, an editor, hooks, styles, or registering a custom element for HA.
---

# Writing a card with preact-homeassistant

This template builds Home Assistant Lovelace cards as Preact components. Every
card boils down to one call to `registerPreactCard` plus a `Component` and an
optional `ConfigComponent`.

## Required structure

```
src/MyCard/
├── index.tsx          # imports `registerPreactCard` and calls it (side-effect entry)
├── MyCard.tsx         # the Component that renders inside <ha-card>
├── MyCard.styles.ts   # css`` tagged template, imported as a side effect from MyCard.tsx
└── MyCardEditor.tsx   # optional ConfigComponent for the visual editor
```

The Vite build entry must point at `index.tsx`. Top-level side-effects in
`index.tsx` register the custom element with the browser.

## The Component

- Wrap the card body in `<ha-card>`. HA's CSS expects this wrapper for borders/elevation.
- Put any padding inside `<div class="card-content">` (HA convention).
- Read entities with `useEntity(entityId)`. The return type is narrowed by domain:
  - `useEntity('calendar.x')` → `CalendarEntity`
  - `useEntity('weather.x')` → `WeatherEntity`
  - `useEntity('sun.sun')` → `SunEntity`
  - `useEntity('fan.x')` → `FanEntity`
  - other domains → `HassEntity` (loose).
- For service calls, use `useService(entityId)`. The domain is parsed from the entity ID prefix and `entity_id` is auto-injected. Service names and data shapes autocomplete for registered domains (currently `fan`):
  ```ts
  const fanService = useService(config.entity);   // `fan.${string}`
  fanService('toggle');                            // turn_off / toggle / etc.
  fanService('set_percentage', { percentage: 67 });
  ```
- For raw access to `hass` (config, services with `return_response`, etc.) use `const { getHass } = useHass()`. Does NOT re-render on entity changes.
- For multi-entity data use `useMultiCalendarEvents` / `useWeatherForecast` / `useCachedFetch`.

## The ConfigComponent (visual editor) — use `ha-form`

**Use HA's `<ha-form>` with selectors.** HA renders the appropriate input for each
field (entity picker with search + icons, text input, number, boolean, select,
color, etc.) and themes them consistently.

```tsx
import type { HomeAssistant } from 'preact-homeassistant';
import { useCallbackStable } from 'preact-homeassistant';
import type { MyCardConfig } from './MyCard';

interface EditorProps {
  hass: HomeAssistant;
  config: MyCardConfig;
  onConfigChanged: (config: MyCardConfig) => void;
}

const SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: 'fan' } } },
  { name: 'name', selector: { text: {} } },
] as const;

const LABELS: Record<string, string> = {
  entity: 'Fan',
  name: 'Name (optional)',
};

export function MyCardEditor({ hass, config, onConfigChanged }: EditorProps) {
  const handleValueChanged = useCallbackStable((e: Event) => {
    const next = (e as CustomEvent).detail?.value as Partial<MyCardConfig> | undefined;
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
```

Common selectors:
- `{ entity: { domain: 'fan' } }` — entity picker scoped to a domain
- `{ entity: { domain: 'weather', multiple: true } }` — multi-pick
- `{ text: {} }` / `{ text: { multiline: true } }`
- `{ number: { min: 0, max: 100, mode: 'slider' } }`
- `{ boolean: {} }`
- `{ select: { mode: 'dropdown', options: [{ value: 'small', label: 'Small' }, …] } }`
- `{ color_rgb: {} }` / `{ ui_color: {} }`

Full reference: https://www.home-assistant.io/docs/blueprint/selectors/

**For complex per-row UIs that don't map cleanly to a schema** (e.g. a list of
calendars with per-row entity + color), drop `<ha-selector>` into the rows of
your own custom layout and let `<ha-form>` handle the top-level fields. See
[`display-calendar/src/CalendarCard/DisplayCalendarEditor.tsx`](https://github.com/stutrek/display-calendar/blob/main/src/CalendarCard/DisplayCalendarEditor.tsx) for the pattern.

### DON'T use `<ha-select>` + `<ha-list-item>` children

The older pattern looks like this and IS BROKEN in current HA:

```tsx
// ❌ Doesn't work in current HA
<ha-select onChange={handler}>
  <ha-list-item value="">Empty</ha-list-item>
  {entities.map((id) => <ha-list-item key={id} value={id}>{name}</ha-list-item>)}
</ha-select>
```

Two compounding reasons:
1. HA rebuilt `ha-select`'s internals around `ha-dropdown` / `wa-popup` (Web
   Awesome) and arbitrary `<ha-list-item>` children no longer participate in
   selection. Clicking an item fires `request-selected` but the select's
   `.value` never updates and no `change` / `selected` event fires.
2. Even with the old `mwc-select`-based version, Preact assigns
   `value={id}` on a custom element as a *property*, not an HTML attribute.
   mwc-list-item's `@property({type: String}) value` doesn't reflect to the
   attribute by default, so `getAttribute('value')` was always `null` — which
   broke some selection paths even in older HA.

`<ha-form>` sidesteps both problems and gives you better UI for free.

## Styles

- Write CSS in a `MyCard.styles.ts` file using the `css\`\`` tagged template from `preact-homeassistant`.
- Import that file as a side-effect from `MyCard.tsx`: `import './MyCard.styles';`
- The card body renders inside a shadow root; `registerPreactCard` injects everything from the `css\`\`` registry into that root automatically.
- Use HA CSS variables for theming: `--primary-text-color`, `--secondary-text-color`, `--card-background-color`, `--primary-color`, `--ha-card-background`, `--divider-color`, `--text-primary-color`.
- For fonts: `font-family: var(--primary-font-family, Roboto, system-ui, sans-serif)`. HA loads Roboto and exposes it via that variable.
- Don't put editor styles in the `css\`\`` registry — the editor renders outside the shadow root. `ha-form` handles editor theming for you anyway.

## Storybook + tests

- Wrap the component in `<HAProvider hass={mockHass} subscribeToEntity={noopSubscribe}>`.
- Use `createMockHass({ entities })` and `noopSubscribe` from `src/__test-utils__/mockHass.ts`. To assert service calls, override `hass.callService = vi.fn()` after creation.
- Import `src/__test-utils__/ha-stubs.ts` (already done from `.storybook/preview.ts` and the vitest setup file).

**Stories must manually inject the card's styles.** Without this you'll see unstyled native buttons / no layout:

```tsx
import { HAProvider, getAllStyles } from 'preact-homeassistant';

const wrap = (entities, config) => (
  <HAProvider hass={createMockHass({ entities })} subscribeToEntity={noopSubscribe}>
    <style>{getAllStyles()}</style>                {/* required in stories */}
    <MyCard config={config} />
  </HAProvider>
);
```

Reason: `registerPreactCard` does this for you inside the shadow root in production. Stories render outside that root, so they have to inject the registered styles themselves.

**Don't story the editor.** `ha-form` is HA-internal; it only renders when
HA's own custom elements (`ha-entity-picker`, `ha-selector`, etc.) are
registered. Verifying the editor means opening it inside a real HA install,
which is the only place its layout is meaningful anyway.

## Cross-repo development with preact-homeassistant

If you're editing `preact-homeassistant` and want the changes to flow into your
card without an npm round-trip, the template's `vite.config.ts`,
`vitest.config.ts`, and `tsconfig.json` already contain a sibling alias:

```ts
// vite.config.ts & vitest.config.ts
const localPreactHA = path.resolve(dirname, '../preact-homeassistant');
const hasLocalPreactHA = fs.existsSync(path.join(localPreactHA, 'package.json'));
// ...
resolve: {
  dedupe: ['preact', 'preact/hooks', 'preact/compat'],   // ESSENTIAL — see below
  alias: hasLocalPreactHA ? { 'preact-homeassistant': localPreactHA } : {},
}
```

**`dedupe` is essential, especially in `vitest.config.ts`.** Without it the
aliased preact-homeassistant pulls in its own copy of `preact`, your card
pulls in a different copy, and any hook call from inside the library crashes
with `Cannot read properties of undefined (reading '__H')` because each preact
copy has its own hook-storage map.

After editing preact-homeassistant, run `pnpm build` in that repo so the
declaration files are regenerated — TypeScript reads from `dist/index.d.ts`.

## Verifying inside HA

`pnpm build` from the card directory writes `dist/<tag>.js`. If you've
symlinked or copied this repo under `<HA config>/www/`, refresh the dashboard
in edit mode to pick up changes. **HA's frontend cache can hold the old script
even after Save** — if the editor still shows the old layout after rebuilding,
close all browser tabs to HA (or use an incognito window) before reopening.

`vite build --watch` from the card directory keeps `dist/` fresh on every edit.

If you want to instrument live HA from devtools or agent-browser, you need a
shadow-piercing query helper because HA wraps everything in shadow roots:

```js
window.deepQS = (root, sel) => {
  const found = [];
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (n.matches && n.matches(sel)) found.push(n);
    if (n.shadowRoot) stack.push(n.shadowRoot);
    if (n.children) for (const c of n.children) stack.push(c);
  }
  return found;
};
```

## The Shadow DOM gotcha

The Component renders inside the card's shadow root. Anything that escapes the
shadow root won't be styled by your `css\`\`` (modals, portals, etc.). If you
need full-document overlay UI, render it into `document.body` from a `useEffect`
hook rather than inside the card tree.

The Editor renders OUTSIDE the shadow root (in HA's settings panel). `ha-form`
handles that for you.

## ha-icon

HA provides Material Design Icons via `<ha-icon icon="mdi:fan" />`. Use it
directly in production. The Storybook stub at `src/__test-utils__/ha-stubs.ts`
only knows a tiny built-in palette; if you need a new icon in stories, add its
path to `ICON_PATHS` in the stub (look the path up via
`require('@mdi/js').mdiFanOff` etc.).

## Don't

- Don't import React or react-dom. Preact-only.
- Don't bundle `home-assistant-js-websocket` types into your card's `.js`; they're erased at compile time.
- Don't use `<ha-select>` + `<ha-list-item>` in editors — use `<ha-form>` with selectors.
- Don't render the editor into the shadow root. Use light DOM (which is what `<ha-form>` already does).
- Don't use the `css\`\`` registry for editor styles — they won't be visible.
- Don't strip the `dedupe` line from `vitest.config.ts`.
- Don't pass `entity_id` in the `data` arg of `useService(...)` — the hook injects it for you.
- Don't try to write Storybook stories for the editor — `ha-form` only renders in real HA.

## Pattern: stub config

```ts
registerPreactCard<MyConfig>({
  type: 'my-card',
  name: 'My Card',
  description: '...',
  Component: MyCard,
  ConfigComponent: MyCardEditor,
  getStubConfig: () => ({ entity: '' }),
});
```

`getStubConfig` is what HA inserts when the user adds the card from the picker
without going through the editor. Keep it minimal but valid.
