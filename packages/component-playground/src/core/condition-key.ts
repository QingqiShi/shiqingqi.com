import type { Condition, ConditionKey, LayerConfig } from "./types.ts";

export const BASE: Condition = { kind: "base" };

/** The conditions a key names: `"checked sm"` names two, a plain key one. */
export function conditionParts(name: string): string[] {
  return name.split(" ").filter(Boolean);
}

export function isCompoundKey(name: string): boolean {
  return conditionParts(name).length > 1;
}

/** The layer's state keys, split into plain states and compound keys. */
export function stateKeys(layerConfig: LayerConfig): {
  plain: string[];
  compound: string[];
} {
  const keys = Object.keys(layerConfig.states ?? {});
  return {
    plain: keys.filter((key) => !isCompoundKey(key)),
    compound: keys.filter(isCompoundKey),
  };
}

/** The compound keys every part of which is active on the element. */
export function activeCompoundKeys(
  layerConfig: LayerConfig,
  variants: readonly string[],
  states: readonly string[],
): string[] {
  const active = new Set([...variants, ...states]);
  return stateKeys(layerConfig).compound.filter((key) =>
    conditionParts(key).every((part) => active.has(part)),
  );
}

export function conditionKey(condition: Condition): ConditionKey {
  if (condition.kind === "base") return "base";
  return `${condition.kind}:${condition.name}`;
}

export function parseConditionKey(key: ConditionKey): Condition {
  if (key === "base") return BASE;
  const separator = key.indexOf(":");
  const kind = key.slice(0, separator);
  const name = key.slice(separator + 1);
  if (kind === "variant") return { kind: "variant", name };
  if (kind === "compound") return { kind: "compound", name };
  if (kind === "preset") return { kind: "preset", name };
  return { kind: "state", name };
}

/** The suffix the export format puts after a layer name. */
export function conditionSuffix(condition: Condition): string {
  return condition.kind === "base" ? "" : `[${condition.name}]`;
}

export function sameCondition(left: Condition, right: Condition): boolean {
  return conditionKey(left) === conditionKey(right);
}
