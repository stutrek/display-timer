import{A as m,d as f,y as b,T as g,u as n,x as v}from"./hooks.module-_viBMoqf.js";import{X as x}from"./iframe-CC_nv4dN.js";import{n as S,c as w}from"./mockHass-CU8r5QjM.js";import"./preload-helper-PPVm8Dsz.js";const p="preact-ha:",E=1440*60*1e3;function C(e){try{const t=localStorage.getItem(`${p}${e}`);if(!t)return;const r=JSON.parse(t);if(Date.now()-r.timestamp>E){localStorage.removeItem(`${p}${e}`);return}return r.data}catch{return}}function H(e,t){try{const r={data:t,timestamp:Date.now()};localStorage.setItem(`${p}${e}`,JSON.stringify(r))}catch(r){console.warn("[preact-homeassistant cache] Failed to save:",r)}}function A(e){const t=m(e);t.current=e;const r=m(null);return r.current===null&&(r.current=((...a)=>t.current(...a))),r.current}const _=x(null);function R({hass:e,subscribeToEntity:t,children:r}){const a=m(e);a.current=e;const o=A(()=>a.current),s=g(()=>({hass:a.current,getHass:o,subscribeToEntity:t}),[o,t]);return n(_.Provider,{value:s,children:r})}function F(){const e=v(_);if(!e)throw new Error("useEntity/useHass must be used within an HAProvider");return e}function N(e){const t=F(),r=`entity:${e}`,[a,o]=f(()=>{const s=t.hass?.states[e];return s||C(r)});return b(()=>t.subscribeToEntity(e,h=>{o(h),H(r,h)}),[e,t.subscribeToEntity,r]),a}const P=(e,...t)=>e.reduce((a,o,s)=>a+o+(t[s]??""),"");P`
  .hello-card {
    padding: 16px;
    font-family: var(--primary-font-family, sans-serif);
  }

  .hello-card__heading {
    font-size: 1.1em;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--primary-text-color, inherit);
  }

  .hello-card__entity-id {
    font-size: 0.85em;
    color: var(--secondary-text-color, #888);
    margin: 0 0 12px;
  }

  .hello-card__state {
    font-size: 1.6em;
    font-weight: 500;
    margin: 0 0 12px;
    color: var(--primary-text-color, inherit);
  }

  .hello-card__attributes {
    font-family: var(--code-font-family, 'SF Mono', Menlo, monospace);
    font-size: 0.8em;
    line-height: 1.4;
    background: var(--card-background-color, rgba(0, 0, 0, 0.2));
    padding: 8px 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0;
    color: var(--primary-text-color, inherit);
  }

  .hello-card__empty {
    padding: 16px;
    color: var(--secondary-text-color, #888);
    font-style: italic;
  }
`;function y({config:e}){const t=N(e.entity);return e.entity?t?n("ha-card",{children:n("div",{class:"card-content hello-card",children:[n("h2",{class:"hello-card__heading",children:t.attributes?.friendly_name??e.entity}),n("p",{class:"hello-card__entity-id",children:t.entity_id}),n("p",{class:"hello-card__state",children:[t.state,t.attributes?.unit_of_measurement?` ${t.attributes.unit_of_measurement}`:""]}),n("pre",{class:"hello-card__attributes",children:JSON.stringify(t.attributes,null,2)})]})}):n("ha-card",{children:n("div",{class:"card-content hello-card__empty",children:["Waiting for ",n("code",{children:e.entity}),"..."]})}):n("ha-card",{children:n("div",{class:"card-content hello-card__empty",children:"No entity configured. Pick one in the card editor."})})}const D={title:"HelloCard",component:y},d=(e,t)=>{const r=w({entities:e});return n(R,{hass:r,subscribeToEntity:S,children:n(y,{config:{entity:t}})})},c={render:()=>d({"sensor.temperature":{entity_id:"sensor.temperature",state:"72",attributes:{friendly_name:"Living Room Temperature",unit_of_measurement:"°F",device_class:"temperature",state_class:"measurement"}}},"sensor.temperature")},i={render:()=>d({},"")},l={render:()=>d({},"sensor.missing")},u={render:()=>d({"sensor.battery":{entity_id:"sensor.battery",state:"84",attributes:{friendly_name:"Phone Battery",unit_of_measurement:"%",device_class:"battery",state_class:"measurement",icon:"mdi:battery-80",is_charging:!1,battery_health:"good"}}},"sensor.battery")};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => wrap({
    'sensor.temperature': {
      entity_id: 'sensor.temperature',
      state: '72',
      attributes: {
        friendly_name: 'Living Room Temperature',
        unit_of_measurement: '°F',
        device_class: 'temperature',
        state_class: 'measurement'
      }
    }
  }, 'sensor.temperature')
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => wrap({}, '')
}`,...i.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => wrap({}, 'sensor.missing')
}`,...l.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => wrap({
    'sensor.battery': {
      entity_id: 'sensor.battery',
      state: '84',
      attributes: {
        friendly_name: 'Phone Battery',
        unit_of_measurement: '%',
        device_class: 'battery',
        state_class: 'measurement',
        icon: 'mdi:battery-80',
        is_charging: false,
        battery_health: 'good'
      }
    }
  }, 'sensor.battery')
}`,...u.parameters?.docs?.source}}};const M=["Default","NoEntityConfigured","EntityNotFound","RichAttributes"];export{c as Default,l as EntityNotFound,i as NoEntityConfigured,u as RichAttributes,M as __namedExportsOrder,D as default};
