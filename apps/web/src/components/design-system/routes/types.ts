import type { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";

/**
 * The kind of thing a route documents, and the outer level of the route map.
 * It answers "what am I looking at": a token page, a component page, or the raw
 * layer underneath both.
 */
export type DesignSystemSectionId =
  "overview" | "foundations" | "components" | "composition";

/**
 * The inner level of the route map: what a component is for, or what a
 * foundation decides. `"composition"` is short enough to read as one list.
 */
export type DesignSystemCategoryId =
  | "visual"
  | "behaviour"
  | "content"
  | "actions"
  | "forms"
  | "dataDisplay"
  | "feedback"
  | "surfaces"
  | "shells";

export interface DesignSystemRoute {
  section: DesignSystemSectionId;
  /** Absent on the sections short enough to list their routes directly. */
  category?: DesignSystemCategoryId;
  /** Locale-agnostic path; resolved per-locale by the consumer at render. */
  path: string;
  /**
   * Extra words the search matches, beyond the route's own name. Never
   * rendered, so they need no `t()` and no translation: they are the industry
   * names a visitor arrives with, deliberately including the ones the glossary
   * rules out — searching "tag" or "pill" should land on Chip and teach the
   * word the system actually uses.
   */
  keywords?: readonly string[];
}

/** Union of every registered path — lets consumers type copy maps for exhaustiveness. */
export type DesignSystemPath = (typeof DESIGN_SYSTEM_ROUTES)[number]["path"];

/**
 * Just the foundations paths, so the illustration map can be a total `Record` over
 * the routes that carry art and a new foundation without one fails to compile.
 */
export type DesignSystemFoundationPath = Extract<
  (typeof DESIGN_SYSTEM_ROUTES)[number],
  { section: "foundations" }
>["path"];

export interface DesignSystemRouteGroup {
  /** Absent when the section lists its routes directly under its own heading. */
  category?: DesignSystemCategoryId;
  paths: DesignSystemPath[];
}

export interface DesignSystemRouteSection {
  section: DesignSystemSectionId;
  groups: DesignSystemRouteGroup[];
}
