import type { LabProps, LabVariant } from "./types.ts";

export interface LabState {
  /** The Variant the props came from, and the one `reset` returns to. */
  variantId: string;
  /** Every prop the Variant or the visitor has set, over the component's own defaults. */
  props: LabProps;
}

export type LabAction =
  | { type: "selectVariant"; variantId: string }
  | { type: "setProp"; prop: string; value: unknown }
  | { type: "reset" };

/**
 * The Lab's state machine, closed over the Variants so `selectVariant` and
 * `reset` can read the configuration a Variant id names.
 *
 * Choosing a Variant replaces the whole prop set rather than merging into it:
 * a Variant is a whole configuration, so what the previous one set has to go.
 */
export function labReducer<P>(variants: readonly LabVariant<P>[]) {
  const propsOf = (variantId: string): LabProps => ({
    ...variants.find((variant) => variant.id === variantId)?.props,
  });

  return function reduce(state: LabState, action: LabAction): LabState {
    switch (action.type) {
      case "selectVariant": {
        return {
          variantId: action.variantId,
          props: propsOf(action.variantId),
        };
      }
      case "setProp": {
        return {
          ...state,
          props: { ...state.props, [action.prop]: action.value },
        };
      }
      case "reset": {
        return { ...state, props: propsOf(state.variantId) };
      }
    }
  };
}
