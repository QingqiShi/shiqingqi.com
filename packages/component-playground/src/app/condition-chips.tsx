import {
  activeCompoundKeys,
  type LayerConfig,
  type LayerNode,
} from "@tuja/component-playground";

interface ConditionChipsProps {
  node: Pick<LayerNode, "variants" | "states">;
  /** Renders the compound-key chip after the plain ones, for this layer. */
  layerConfig?: LayerConfig;
}

/** The chips a layer's active variants and states render as. */
export function ConditionChips({ node, layerConfig }: ConditionChipsProps) {
  return (
    <>
      {node.variants.map((variant) => (
        <span
          className="pg-chip pg-chip--variant"
          key={`v${variant}`}
          title={`Variant ${variant}`}
        >
          {variant}
        </span>
      ))}
      {node.states.map((state) => (
        <span
          className="pg-chip pg-chip--state"
          key={`s${state}`}
          title={`Rendered in the ${state} state`}
        >
          :{state}
        </span>
      ))}
      {layerConfig
        ? activeCompoundKeys(layerConfig, node.variants, node.states).map(
            (key) => (
              <span className="pg-chip pg-chip--compound" key={`c${key}`}>
                {key}
              </span>
            ),
          )
        : null}
    </>
  );
}
