import { conditionSuffix } from "./condition-key.ts";
import type { ChangeStore } from "./create-change-store.ts";
import type { TinkerConfig } from "./types.ts";

const UNSET = "(unset)";

/**
 * The text the Export button copies: one line per change, and nothing the
 * config already says.
 */
export function serialiseExport(
  config: TinkerConfig,
  store: ChangeStore,
): string {
  const lines = [
    "component-tinker v1",
    `component: ${config.component}`,
    `source: ${config.source}`,
  ];

  for (const change of store.changes()) {
    const target = `${change.layer}${conditionSuffix(change.condition)}.${change.property}`;
    const from = change.from === null ? UNSET : String(change.from);
    const to = change.to === null ? UNSET : String(change.to);
    lines.push(`${target}: ${from} -> ${to}`);
  }

  for (const change of store.toggleChanges()) {
    lines.push(
      `${change.layer}.${change.toggle}: ${change.from} -> ${change.to}`,
    );
  }

  return `${lines.join("\n")}\n`;
}
