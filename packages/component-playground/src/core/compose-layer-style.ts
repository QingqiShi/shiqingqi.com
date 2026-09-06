import { activeCompoundKeys, BASE } from "./condition-key.ts";
import type { TokenIndex } from "./create-token-index.ts";
import { cornerShapeFor, resolveStyleValue } from "./create-token-index.ts";
import type { Condition, LayerConfig, StyleMap, StyleValue } from "./types.ts";

/** The style map an element takes from one condition. */
export type StyleReader = (condition: Condition) => StyleMap;

export interface ComposedStyle {
  /** Preset classes, plus the class a preset-kind token value applies. */
  classNames: string[];
  /** The declarations React puts on the element, camelCase. */
  style: Record<string, string>;
  /** Which condition supplies each property's current value. */
  sources: Record<string, Condition>;
  /** Each property's current value as written, before it resolves. */
  values: Record<string, StyleValue>;
}

/**
 * Reads the conditions an element is under, in the order the spec fixes:
 * presets, then `base`, then each active variant, then each active state,
 * then each active compound key.
 */
export function activeConditions(args: {
  layerConfig: LayerConfig;
  variants: readonly string[];
  states: readonly string[];
}): Condition[] {
  const { layerConfig, variants, states } = args;
  return [
    BASE,
    ...variants.map((name): Condition => ({ kind: "variant", name })),
    ...states.map((name): Condition => ({ kind: "state", name })),
    ...activeCompoundKeys(layerConfig, variants, states).map(
      (name): Condition => ({ kind: "compound", name }),
    ),
  ];
}

/** What a preset paints while `state` is active, one entry per preset. */
function presetLayers(
  layerConfig: LayerConfig,
  index: TokenIndex,
  state: string,
): { condition: Condition; styles: StyleMap }[] {
  return (layerConfig.presets ?? []).flatMap((preset) => {
    const styles = index.catalogue.presets[preset]?.states[state];
    if (!styles) return [];
    const condition: Condition = { kind: "preset", name: preset };
    return [{ condition, styles }];
  });
}

export function composeLayerStyle(args: {
  layerConfig: LayerConfig;
  variants: readonly string[];
  states: readonly string[];
  index: TokenIndex;
  read: StyleReader;
}): ComposedStyle {
  const { layerConfig, variants, states, index, read } = args;

  const classNames: string[] = [];
  for (const preset of layerConfig.presets ?? []) {
    const entry = index.catalogue.presets[preset];
    if (entry?.className) classNames.push(entry.className);
  }

  // A preset token drops any declaration an earlier condition set for the same
  // property, so the map has to lose a key. Insertion order is the cascade.
  const style = new Map<string, string>();
  const sources: Record<string, Condition> = {};
  const values: Record<string, StyleValue> = {};

  const stack: { condition: Condition; styles: StyleMap }[] = [];
  for (const condition of activeConditions({ layerConfig, variants, states })) {
    if (condition.kind === "state") {
      stack.push(...presetLayers(layerConfig, index, condition.name));
    }
    stack.push({ condition, styles: read(condition) });
  }

  for (const { condition, styles } of stack) {
    for (const [property, value] of Object.entries(styles)) {
      sources[property] = condition;
      values[property] = value;
      if (index.isPresetToken(String(value))) {
        const entry = index.catalogue.presets[String(value)];
        if (entry?.className) classNames.push(entry.className);
        style.delete(property);
        continue;
      }
      style.set(property, resolveStyleValue(value, index));
      if (property === "borderRadius") {
        const shape = cornerShapeFor(value, index);
        if (shape) style.set("cornerShape", shape);
      }
    }
  }

  return { classNames, style: Object.fromEntries(style), sources, values };
}
