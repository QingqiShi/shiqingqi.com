import type { DesignSystemCategoryId } from "./types.ts";

/**
 * Category render order within Components: what you write with, what the
 * visitor operates, what you collect input through, what labels, what reports
 * back, what holds it all, and the frame around the whole page.
 */
export const DESIGN_SYSTEM_CATEGORY_ORDER = [
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
