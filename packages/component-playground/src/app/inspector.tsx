import {
  activeConditions,
  composeLayerStyle,
  resolveEditCondition,
  sameCondition,
  styleReader,
  type ChangeStore,
  type Condition,
  type LayerConfig,
  type LayerNode,
  type PlaygroundConfig,
  type TokenIndex,
} from "@tuja/component-playground";
import { useLayoutEffect, useState } from "react";
import { ConditionChips } from "./condition-chips.tsx";
import { EffectControls } from "./effect-controls.tsx";
import { checkGuardrails, type Guardrail } from "./model/check-guardrails.ts";
import {
  GROUP_ORDER,
  addableIn,
  groupOf,
  isEditable,
  type PropertyGroup,
} from "./model/properties.ts";
import { Popover } from "./popover.tsx";
import { PickerBody, TokenField, ValueChip } from "./value-chip.tsx";

function conditionName(condition: Condition): string {
  if (condition.kind === "base") return "base";
  if (condition.kind === "preset") return `preset ${condition.name}`;
  return `[${condition.name}]`;
}

/** The properties this element takes from an edit rather than from the config. */
function changedProperties(
  store: ChangeStore,
  layerConfig: LayerConfig,
  node: LayerNode,
): Set<string> {
  const read = styleReader(store, node.layer);
  const changed = new Set<string>();
  const conditions = activeConditions({
    layerConfig,
    variants: node.variants,
    states: node.states,
  });
  for (const condition of conditions) {
    for (const property of Object.keys(read(condition))) {
      if (store.isEdited(node.layer, condition, property))
        changed.add(property);
      else changed.delete(property);
    }
  }
  return changed;
}

/**
 * The condition each removed declaration is removed at, where no later
 * condition puts the property back.
 */
function removedConditions(
  store: ChangeStore,
  layerConfig: LayerConfig,
  node: LayerNode,
): Map<string, Condition> {
  const read = styleReader(store, node.layer);
  const removed = new Map<string, Condition>();
  const conditions = activeConditions({
    layerConfig,
    variants: node.variants,
    states: node.states,
  });
  for (const condition of conditions) {
    for (const property of Object.keys(
      store.baselineStyle(node.layer, condition),
    )) {
      if (store.isRemoved(node.layer, condition, property))
        removed.set(property, condition);
    }
    for (const property of Object.keys(read(condition)))
      removed.delete(property);
  }
  return removed;
}

interface InspectorProps {
  config: PlaygroundConfig;
  store: ChangeStore;
  index: TokenIndex;
  node: LayerNode | null;
  isPhone: boolean;
  /** Changes whenever the canvas has repainted, so measurements refresh. */
  renderKey: string;
}

interface Measured {
  guardrails: Guardrail[];
  scrolls: boolean;
}

export function Inspector({
  config,
  store,
  index,
  node,
  isPhone,
  renderKey,
}: InspectorProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<{
    group: PropertyGroup;
    anchor: DOMRect;
  } | null>(null);
  const [pending, setPending] = useState<{
    property: string;
    anchor: DOMRect;
  } | null>(null);
  const [measured, setMeasured] = useState<Measured>({
    guardrails: [],
    scrolls: false,
  });

  const id = node?.id ?? "";
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps -- a guardrail is measured from the laid-out DOM, which no render can read, so the effect must store what it read; `renderKey` already changes with every input that changes what is on screen, and `node` is a fresh object each render, so listing it would measure in a loop */
  useLayoutEffect(() => {
    const element = document.querySelector<HTMLElement>(
      `.pg-cell-body [data-playground-id="${id}"]`,
    );
    const frame = element?.closest(".pg-cell-frame");
    if (!element || !frame || !node) {
      setMeasured({ guardrails: [], scrolls: false });
      return;
    }
    setMeasured({
      guardrails: checkGuardrails(
        element,
        frame,
        changedProperties(store, config.layers[node.layer], node),
      ),
      scrolls:
        element.scrollHeight > element.clientHeight ||
        element.scrollWidth > element.clientWidth,
    });
  }, [id, renderKey]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps -- the measurement effect above ends here */

  if (!node) {
    return (
      <div className="pg-inspector-empty">
        Select a layer on the canvas or in the tree.
      </div>
    );
  }

  const layerConfig = config.layers[node.layer];
  const read = styleReader(store, node.layer);
  const composed = composeLayerStyle({
    layerConfig,
    variants: node.variants,
    states: node.states,
    index,
    read,
  });
  const scopeFor = (property: string) =>
    resolveEditCondition({
      layerConfig,
      property,
      variants: node.variants,
      states: node.states,
      read,
    });
  // The empty string names no property, so no condition sets it and the
  // answer is the scope a brand new property lands in.
  const newEditScope = scopeFor("");

  const removed = removedConditions(store, layerConfig, node);
  // A removed declaration keeps its row, so the reader sees what was dropped
  // and can put it back.
  const properties = [
    ...new Set([...Object.keys(composed.values), ...removed.keys()]),
  ].sort();
  const byGroup = new Map<PropertyGroup, string[]>();
  for (const property of properties) {
    const group = groupOf(property);
    byGroup.set(group, [...(byGroup.get(group) ?? []), property]);
  }
  const isOpen = (group: PropertyGroup) =>
    open[group] ??
    (group === "Effects" || (byGroup.get(group)?.length ?? 0) > 0);

  // A warning about a property the layer sets is shown beside that row.
  const loose = measured.guardrails.filter(
    (warning) =>
      warning.property === undefined || !properties.includes(warning.property),
  );

  const setValue = (property: string, value: string) => {
    store.set(node.layer, scopeFor(property), property, value);
  };

  // A declaration the config writes is removed; one this session added is
  // only dropped, because the config has nothing to remove.
  const dropValue = (property: string, source: Condition) => {
    if (property in store.baselineStyle(node.layer, source))
      store.remove(node.layer, source, property);
    else store.clear(node.layer, source, property);
  };

  return (
    <div className="pg-inspector-scroll">
      <header className="pg-inspector-head">
        <div className="pg-inspector-title">
          <span className="pg-layer-name">{node.layer}</span>
          <span className="pg-tag">{node.tag}</span>
          <ConditionChips node={node} layerConfig={layerConfig} />
        </div>
        <p className="pg-scope">
          New edits write to <b>{conditionName(newEditScope)}</b>
        </p>
        {layerConfig.presets?.length ? (
          <p className="pg-presets">
            <span className="pg-field-label">presets</span>
            {layerConfig.presets.map((preset) => (
              <span className="pg-chip pg-chip--preset" key={preset}>
                {preset}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {loose.length > 0 ? (
        <ul className="pg-warnings">
          {loose.map((warning) => (
            <li key={warning.text}>{warning.text}</li>
          ))}
        </ul>
      ) : null}

      {node.opaque ? (
        <p className="pg-inspector-empty">
          {node.layer} is an opaque layer. It shows in the tree so the structure
          is complete, and it has no property to edit.
        </p>
      ) : (
        GROUP_ORDER.map((group) => {
          const groupProperties = byGroup.get(group) ?? [];
          const addable = addableIn(group, new Set(properties));
          return (
            <section className="pg-group" key={group}>
              <h2 className="pg-group-head">
                <button
                  type="button"
                  className="pg-group-toggle"
                  aria-expanded={isOpen(group)}
                  onClick={() => {
                    setOpen({ ...open, [group]: !isOpen(group) });
                  }}
                >
                  <span className="pg-caret" aria-hidden>
                    {isOpen(group) ? "−" : "+"}
                  </span>
                  {group}
                  {groupProperties.length > 0 ? (
                    <span className="pg-count">{groupProperties.length}</span>
                  ) : null}
                </button>
                {addable.length > 0 ? (
                  <button
                    type="button"
                    className="pg-add"
                    aria-label={`Add a ${group.toLowerCase()} property`}
                    onClick={(event) => {
                      setAdding({
                        group,
                        anchor: event.currentTarget.getBoundingClientRect(),
                      });
                      setOpen({ ...open, [group]: true });
                    }}
                  >
                    +
                  </button>
                ) : null}
              </h2>
              {isOpen(group) ? (
                <div className="pg-rows">
                  {groupProperties.map((property) => {
                    const source =
                      removed.get(property) ?? composed.sources[property];
                    const scope = scopeFor(property);
                    const value = composed.values[property];
                    const edited = store.isEdited(node.layer, source, property);
                    const removable =
                      source.kind !== "preset" &&
                      !store.isRemoved(node.layer, source, property);
                    const warning = measured.guardrails.find(
                      (item) => item.property === property,
                    );
                    return (
                      <div
                        className={edited ? "pg-row pg-row--edited" : "pg-row"}
                        key={property}
                      >
                        <span className="pg-property">{property}</span>
                        {isEditable(property) ? (
                          <TokenField
                            property={property}
                            value={value}
                            index={index}
                            isPhone={isPhone}
                            onPick={(picked) => {
                              setValue(property, picked);
                            }}
                          />
                        ) : (
                          <span className="pg-value-static">
                            <ValueChip
                              property={property}
                              value={value}
                              index={index}
                            />
                          </span>
                        )}
                        <span className="pg-row-source">
                          {conditionName(source)}
                          {sameCondition(source, scope)
                            ? ""
                            : ` → ${conditionName(scope)}`}
                        </span>
                        <span className="pg-row-actions">
                          {removable ? (
                            <button
                              type="button"
                              className="pg-remove"
                              onClick={() => {
                                dropValue(property, source);
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                          {edited ? (
                            <button
                              type="button"
                              className="pg-reset"
                              onClick={() => {
                                store.clear(node.layer, source, property);
                              }}
                            >
                              Reset
                            </button>
                          ) : null}
                        </span>
                        {warning ? (
                          <p className="pg-row-warning">{warning.text}</p>
                        ) : null}
                      </div>
                    );
                  })}
                  {group === "Effects" ? (
                    <EffectControls
                      layer={node.layer}
                      store={store}
                      index={index}
                      isPhone={isPhone}
                      scrolls={measured.scrolls}
                    />
                  ) : null}
                  {groupProperties.length === 0 && group !== "Effects" ? (
                    <p className="pg-empty">Nothing set here.</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })
      )}

      {adding ? (
        <Popover
          anchor={adding.anchor}
          title={`Add to ${adding.group}`}
          isPhone={isPhone}
          onClose={() => {
            setAdding(null);
          }}
        >
          <ul className="pg-options">
            {addableIn(adding.group, new Set(properties)).map((property) => (
              <li key={property}>
                <button
                  type="button"
                  className="pg-option"
                  onClick={() => {
                    setPending({ property, anchor: adding.anchor });
                    setAdding(null);
                  }}
                >
                  <span className="pg-token-name">{property}</span>
                </button>
              </li>
            ))}
          </ul>
        </Popover>
      ) : null}

      {pending ? (
        <Popover
          anchor={pending.anchor}
          title={pending.property}
          isPhone={isPhone}
          onClose={() => {
            setPending(null);
          }}
        >
          <PickerBody
            property={pending.property}
            current={undefined}
            index={index}
            onPick={(picked) => {
              setValue(pending.property, picked);
              setPending(null);
            }}
          />
        </Popover>
      ) : null}
    </div>
  );
}
