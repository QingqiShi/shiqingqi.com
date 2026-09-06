import type { StyleReader } from "./compose-layer-style.ts";
import { activeCompoundKeys, BASE } from "./condition-key.ts";
import type { Condition, LayerConfig } from "./types.ts";

/**
 * The condition an edit to `property` writes to:
 *
 * 1. the last active state that already sets it,
 * 2. else the last active variant that already sets it,
 * 3. else the last active state,
 * 4. else `base`.
 *
 * A compound key counts as a state in step 1 and comes after every plain one,
 * so a value that changes with both a state and a variant stays that way. A
 * new property lands on a plain state, which is the broader of the two.
 *
 * So a rest-cell edit lands everywhere, a state-cell edit lands on that state,
 * and a size-specific property stays size-specific.
 */
export function resolveEditCondition(args: {
  layerConfig: LayerConfig;
  property: string;
  variants: readonly string[];
  states: readonly string[];
  read: StyleReader;
}): Condition {
  const { layerConfig, property, variants, states, read } = args;

  const stateConditions = states.map((name): Condition => ({
    kind: "state",
    name,
  }));
  const compoundConditions = activeCompoundKeys(
    layerConfig,
    variants,
    states,
  ).map((name): Condition => ({ kind: "compound", name }));
  const variantConditions = variants.map((name): Condition => ({
    kind: "variant",
    name,
  }));

  const definedIn = (conditions: Condition[]) =>
    [...conditions].reverse().find((condition) => property in read(condition));

  return (
    definedIn([...stateConditions, ...compoundConditions]) ??
    definedIn(variantConditions) ??
    stateConditions.at(-1) ??
    BASE
  );
}
