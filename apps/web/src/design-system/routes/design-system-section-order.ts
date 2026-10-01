import type { DesignSystemSectionId } from "./types.ts";

/**
 * Section render order: the tokens first, then the components built from them,
 * then the raw composition layer. Sections with no routes are dropped by
 * `getDesignSystemRouteSections`, so seeding a future one here is harmless.
 */
export const DESIGN_SYSTEM_SECTION_ORDER = [
  "overview",
  "foundations",
  "components",
  "composition",
] as const satisfies readonly DesignSystemSectionId[];
