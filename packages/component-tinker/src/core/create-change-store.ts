import { conditionKey, parseConditionKey, stateKeys } from "./condition-key.ts";
import type {
  Condition,
  ConditionKey,
  LayerConfig,
  TinkerConfig,
  StyleMap,
  StyleValue,
} from "./types.ts";

export interface PropertyChange {
  layer: string;
  condition: Condition;
  property: string;
  /** The value in the config, or null where the config sets none. */
  from: StyleValue | null;
  /** The value to write, or null where the declaration is removed. */
  to: StyleValue | null;
}

export interface ToggleChange {
  layer: string;
  toggle: string;
  from: string;
  to: string;
}

/** One condition's edits: a `null` value is a removed declaration. */
type Edits = Record<string, StyleValue | null>;

export interface StoreSnapshot {
  /** Keyed by layer, then by condition; both are names a config writes. */
  overrides: Record<
    string,
    Record<ConditionKey, Edits | undefined> | undefined
  >;
  toggles: Record<string, Record<string, string> | undefined>;
}

export interface ChangeStore {
  config: TinkerConfig;
  /** The style map the config declares for one condition. */
  baselineStyle(layer: string, condition: Condition): StyleMap;
  /** The config's map with this session's edits applied. */
  style(layer: string, condition: Condition): StyleMap;
  get(
    layer: string,
    condition: Condition,
    property: string,
  ): StyleValue | undefined;
  set(
    layer: string,
    condition: Condition,
    property: string,
    value: StyleValue,
  ): void;
  /** Drops the declaration, as deleting it from the config would. */
  remove(layer: string, condition: Condition, property: string): void;
  /** Drops the edit and puts the config's value back. */
  clear(layer: string, condition: Condition, property: string): void;
  isEdited(layer: string, condition: Condition, property: string): boolean;
  isRemoved(layer: string, condition: Condition, property: string): boolean;
  toggle(layer: string, name: string): string;
  setToggle(layer: string, name: string, value: string): void;
  changes(): PropertyChange[];
  toggleChanges(): ToggleChange[];
  resetAll(): void;
  subscribe(listener: () => void): () => void;
  snapshot(): StoreSnapshot;
  /** Restores an autosave, which may predate a field the snapshot now has. */
  hydrate(snapshot: Partial<StoreSnapshot>): void;
}

const NO_TOGGLE = "none";

function conditionOrder(layerConfig: LayerConfig): ConditionKey[] {
  const { plain, compound } = stateKeys(layerConfig);
  return [
    "base",
    ...Object.keys(layerConfig.variants ?? {}).map((name) => `variant:${name}`),
    ...plain.map((name) => `state:${name}`),
    ...compound.map((name) => `compound:${name}`),
  ];
}

function baselineMap(layerConfig: LayerConfig, condition: Condition): StyleMap {
  if (condition.kind === "base") return layerConfig.base ?? {};
  if (condition.kind === "variant") {
    return layerConfig.variants?.[condition.name] ?? {};
  }
  if (condition.kind === "preset") return {};
  return layerConfig.states?.[condition.name] ?? {};
}

export function createChangeStore(config: TinkerConfig): ChangeStore {
  let state: StoreSnapshot = { overrides: {}, toggles: {} };
  const listeners = new Set<() => void>();

  function announce() {
    for (const listener of listeners) listener();
  }

  function overridesFor(layer: string, key: ConditionKey) {
    return state.overrides[layer]?.[key];
  }

  function layerConfigFor(layer: string): LayerConfig {
    if (!Object.hasOwn(config.layers, layer)) {
      throw new Error(`Unknown layer "${layer}"`);
    }
    return config.layers[layer];
  }

  function editsFor(layer: string, key: ConditionKey): Edits {
    const byCondition = (state.overrides[layer] ??= {});
    return (byCondition[key] ??= {});
  }

  const store: ChangeStore = {
    config,

    baselineStyle(layer, condition) {
      return baselineMap(layerConfigFor(layer), condition);
    },

    style(layer, condition) {
      const base = baselineMap(layerConfigFor(layer), condition);
      const edits = overridesFor(layer, conditionKey(condition));
      if (!edits) return base;
      const styles: StyleMap = {};
      // The config's order first, so an edited property keeps its place and a
      // new one lands at the end, as writing it into the config would.
      for (const [property, value] of Object.entries(base)) {
        if (edits[property] !== null) styles[property] = value;
      }
      for (const [property, value] of Object.entries(edits)) {
        if (value !== null) styles[property] = value;
      }
      return styles;
    },

    get(layer, condition, property) {
      return store.style(layer, condition)[property];
    },

    set(layer, condition, property, value) {
      editsFor(layer, conditionKey(condition))[property] = value;
      announce();
    },

    remove(layer, condition, property) {
      editsFor(layer, conditionKey(condition))[property] = null;
      announce();
    },

    clear(layer, condition, property) {
      const key = conditionKey(condition);
      const byCondition = state.overrides[layer];
      const edits = byCondition?.[key];
      if (!edits) return;
      const { [property]: _cleared, ...kept } = edits;
      byCondition[key] = kept;
      announce();
    },

    isEdited(layer, condition, property) {
      const edits = overridesFor(layer, conditionKey(condition));
      return edits !== undefined && property in edits;
    },

    isRemoved(layer, condition, property) {
      return overridesFor(layer, conditionKey(condition))?.[property] === null;
    },

    toggle(layer, name) {
      return state.toggles[layer]?.[name] ?? NO_TOGGLE;
    },

    setToggle(layer, name, value) {
      const toggles = (state.toggles[layer] ??= {});
      toggles[name] = value;
      announce();
    },

    changes() {
      const changes: PropertyChange[] = [];
      for (const [layer, layerConfig] of Object.entries(config.layers)) {
        const byCondition = state.overrides[layer];
        if (!byCondition) continue;
        const keys = [
          ...conditionOrder(layerConfig),
          ...Object.keys(byCondition),
        ];
        const seen = new Set<ConditionKey>();
        for (const key of keys) {
          if (seen.has(key)) continue;
          seen.add(key);
          const edits = byCondition[key];
          if (!edits) continue;
          const condition = parseConditionKey(key);
          const baseline = baselineMap(layerConfig, condition);
          for (const [property, value] of Object.entries(edits)) {
            const from = baseline[property] ?? null;
            if (from === value) continue;
            changes.push({ layer, condition, property, from, to: value });
          }
        }
      }
      return changes;
    },

    toggleChanges() {
      const changes: ToggleChange[] = [];
      for (const layer of Object.keys(config.layers)) {
        const toggles = state.toggles[layer];
        if (!toggles) continue;
        for (const [toggle, value] of Object.entries(toggles)) {
          if (value === NO_TOGGLE) continue;
          changes.push({ layer, toggle, from: NO_TOGGLE, to: value });
        }
      }
      return changes;
    },

    resetAll() {
      state = { overrides: {}, toggles: {} };
      announce();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    snapshot() {
      return structuredClone(state);
    },

    hydrate(snapshot) {
      state = {
        overrides: snapshot.overrides ?? {},
        toggles: snapshot.toggles ?? {},
      };
      announce();
    },
  };

  return store;
}

/** Keys the autosave, so an edited config does not restore stale edits. */
export function configHash(config: TinkerConfig): string {
  const text = JSON.stringify({
    component: config.component,
    source: config.source,
    layers: config.layers,
  });
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}
