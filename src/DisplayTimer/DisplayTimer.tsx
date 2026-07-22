import { HACard, useEntity } from 'preact-homeassistant';
import './DisplayTimer.styles';

export interface DisplayTimerConfig {
  entity: string;
}

export function DisplayTimer({ config }: { config: DisplayTimerConfig }) {
  const entity = useEntity(config.entity);

  if (!config.entity) {
    return (
      <HACard>
        <div class="card-content display-timer__empty">
          No entity configured. Pick one in the card editor.
        </div>
      </HACard>
    );
  }

  if (!entity) {
    return (
      <HACard>
        <div class="card-content display-timer__empty">
          Waiting for <code>{config.entity}</code>...
        </div>
      </HACard>
    );
  }

  return (
    <HACard align="top">
      <div class="card-content display-timer">
        <h2 class="display-timer__heading">{entity.attributes?.friendly_name ?? config.entity}</h2>
        <p class="display-timer__entity-id">{entity.entity_id}</p>
        <p class="display-timer__state">
          {entity.state}
          {entity.attributes?.unit_of_measurement
            ? ` ${entity.attributes.unit_of_measurement}`
            : ''}
        </p>
        <pre class="display-timer__attributes">{JSON.stringify(entity.attributes, null, 2)}</pre>
      </div>
    </HACard>
  );
}
