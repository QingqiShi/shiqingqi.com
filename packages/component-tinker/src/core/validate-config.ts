import { conditionParts, stateKeys } from "./condition-key.ts";
import { createChangeStore } from "./create-change-store.ts";
import type { TokenIndex } from "./create-token-index.ts";
import { createTokenIndex, tokenReferencesIn } from "./create-token-index.ts";
import { flattenTree } from "./flatten-tree.ts";
import { renderCell } from "./render-cell.ts";
import type {
  Catalogue,
  LayerConfig,
  TinkerConfig,
  StyleMap,
} from "./types.ts";
import { withSuggestion } from "./with-suggestion.ts";

function checkStyleMap(
  where: string,
  styles: StyleMap,
  index: TokenIndex,
  problems: string[],
) {
  for (const [property, value] of Object.entries(styles)) {
    for (const reference of tokenReferencesIn(value, index)) {
      if (index.ref(reference) !== undefined) continue;
      if (index.isPresetToken(reference)) continue;
      problems.push(
        withSuggestion(
          `${where}.${property}: unknown token "${reference}".`,
          reference,
          index.names,
        ),
      );
    }
  }
}

/**
 * Every state name the layer answers to: its own plain keys, the states its
 * presets paint, and the state a compound key names. A state that changes only
 * with a variant lives in compound keys alone, so it has no plain key.
 */
function statesOf(layerConfig: LayerConfig, catalogue: Catalogue): string[] {
  const { plain, compound } = stateKeys(layerConfig);
  const variants = Object.keys(layerConfig.variants ?? {});
  const fromPresets = (layerConfig.presets ?? []).flatMap((preset) =>
    Object.keys(catalogue.presets[preset]?.states ?? {}),
  );
  const fromCompound = compound.flatMap((key) =>
    conditionParts(key).filter((part) => !variants.includes(part)),
  );
  return [...new Set([...plain, ...fromPresets, ...fromCompound])];
}

function checkCompoundKey(
  layer: string,
  key: string,
  known: string[],
  problems: string[],
) {
  const unnamed = conditionParts(key).filter((part) => !known.includes(part));
  // The first unknown part is the state the compound applies to, which a
  // layer can declare here and nowhere else. Every other part must be known.
  for (const part of unnamed.slice(1)) {
    problems.push(
      withSuggestion(
        `${layer}[${key}]: "${part}" is neither a variant nor a state of the layer.`,
        part,
        known,
      ),
    );
  }
}

function presetGroupNames(catalogue: Catalogue): string[] {
  return [
    ...new Set(
      Object.values(catalogue.presets).flatMap((preset) =>
        preset ? [preset.group] : [],
      ),
    ),
  ].sort();
}

/**
 * Everything that has to hold before a tinker can be built. An unknown
 * token, preset, layer, variant or state is a typo the agent should see now,
 * not a silently missing style in the browser.
 */
export function validateConfig(
  config: TinkerConfig,
  catalogue: Catalogue,
): string[] {
  const index = createTokenIndex(catalogue);
  const problems: string[] = [];
  const layerNames = Object.keys(config.layers);

  for (const [layer, layerConfig] of Object.entries(config.layers)) {
    for (const preset of layerConfig.presets ?? []) {
      if (catalogue.presets[preset]) continue;
      const message = `${layer}: unknown preset "${preset}".`;
      const suggested = withSuggestion(message, preset, index.presetNames);
      problems.push(
        suggested === message
          ? `${message} Presets are ${presetGroupNames(catalogue).join(", ")}.`
          : suggested,
      );
    }
    checkStyleMap(layer, layerConfig.base ?? {}, index, problems);
    for (const [variant, styles] of Object.entries(
      layerConfig.variants ?? {},
    )) {
      checkStyleMap(`${layer}[${variant}]`, styles, index, problems);
    }
    for (const [state, styles] of Object.entries(layerConfig.states ?? {})) {
      checkStyleMap(`${layer}[${state}]`, styles, index, problems);
    }
    const named = [
      ...Object.keys(layerConfig.variants ?? {}),
      ...stateKeys(layerConfig).plain,
      ...(layerConfig.presets ?? []).flatMap((preset) =>
        Object.keys(catalogue.presets[preset]?.states ?? {}),
      ),
    ];
    for (const key of stateKeys(layerConfig).compound) {
      checkCompoundKey(layer, key, named, problems);
    }
  }

  if (problems.length > 0) return problems;

  const store = createChangeStore(config);
  config.cells.forEach((cell, cellIndex) => {
    const rendered = renderCell({
      cell,
      cellIndex,
      config,
      index,
      store,
      onUnknownLayer: (layer) => {
        problems.push(
          withSuggestion(
            `Cell "${cell.title}" uses data-layer="${layer}", which the config does not declare.`,
            layer,
            layerNames,
          ),
        );
      },
    });
    for (const node of flattenTree(rendered.tree)) {
      if (!Object.hasOwn(config.layers, node.layer)) continue;
      const layerConfig = config.layers[node.layer];
      const variants = Object.keys(layerConfig.variants ?? {});
      const states = statesOf(layerConfig, catalogue);
      for (const variant of node.variants) {
        if (variants.includes(variant)) continue;
        problems.push(
          withSuggestion(
            `Cell "${cell.title}": layer "${node.layer}" has no variant "${variant}".`,
            variant,
            variants,
          ),
        );
      }
      for (const state of node.states) {
        if (states.includes(state)) continue;
        problems.push(
          withSuggestion(
            `Cell "${cell.title}": layer "${node.layer}" has no state "${state}".`,
            state,
            states,
          ),
        );
      }
    }
  });

  return problems;
}

export function assertValidConfig(
  config: TinkerConfig,
  catalogue: Catalogue,
): void {
  const problems = validateConfig(config, catalogue);
  if (problems.length === 0) return;
  throw new Error(
    `The tinker config has ${String(problems.length)} problem${problems.length === 1 ? "" : "s"}:\n  ${problems.join("\n  ")}`,
  );
}
