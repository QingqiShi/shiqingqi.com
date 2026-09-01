import type { GuideOptions } from "../types";

/** No sub-cell guides drawn until the visitor turns one on. */
export const DEFAULT_GUIDES: GuideOptions = {
  halves: false,
  thirds: false,
  baseline: false,
};
