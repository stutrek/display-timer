import { HACard, useEntity } from 'preact-homeassistant';
import './__CardClass__.styles';

export interface __CardClass__Config {
  entity: string;
}

export function __CardClass__({ config }: { config: __CardClass__Config }) {
  const entity = useEntity(config.entity);

  if (!config.entity) {
    return (
      <HACard>
        <div class="card-content __CARD_TAG____empty">
          No entity configured. Pick one in the card editor.
        </div>
      </HACard>
    );
  }

  if (!entity) {
    return (
      <HACard>
        <div class="card-content __CARD_TAG____empty">
          Waiting for <code>{config.entity}</code>...
        </div>
      </HACard>
    );
  }

  return (
    <HACard align="top">
      <div class="card-content __CARD_TAG__">
        <h2 class="__CARD_TAG____heading">{entity.attributes?.friendly_name ?? config.entity}</h2>
        <p class="__CARD_TAG____entity-id">{entity.entity_id}</p>
        <p class="__CARD_TAG____state">
          {entity.state}
          {entity.attributes?.unit_of_measurement
            ? ` ${entity.attributes.unit_of_measurement}`
            : ''}
        </p>
        <pre class="__CARD_TAG____attributes">{JSON.stringify(entity.attributes, null, 2)}</pre>
      </div>
    </HACard>
  );
}
