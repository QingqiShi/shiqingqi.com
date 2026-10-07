import type { DesignSystemCategoryId } from "./types.ts";

/**
 * Category render order within Foundations: where to start, what a surface
 * looks like, and how it behaves. Then within Components: what you write with, what the
 * visitor operates, what you collect input through, what labels, what reports
 * back, what holds it all, and the frame around the whole page.
 */
export const DESIGN_SYSTEM_CATEGORY_ORDER = [
  "basics",
  "visual",
  "behaviour",
  "content",
  "actions",
  "forms",
  "dataDisplay",
  "feedback",
  "surfaces",
  "shells",
] as const satisfies readonly DesignSystemCategoryId[];
