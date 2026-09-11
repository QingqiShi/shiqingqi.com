import type { TinkerConfig } from "./types.ts";

/**
 * Declares one component's tinker. It only types and checks the shape;
 * token references and preset names are checked against the design system at
 * build time, where a typo can name its nearest valid neighbour.
 */
export function tinker(config: TinkerConfig): TinkerConfig {
  if (!config.component) throw new Error("A tinker needs a component name.");
  if (!config.source) throw new Error("A tinker needs a source path.");
  if (Object.keys(config.layers).length === 0) {
    throw new Error("A tinker needs at least one layer.");
  }
  if (config.cells.length === 0) {
    throw new Error("A tinker needs at least one cell.");
  }
  return config;
}
