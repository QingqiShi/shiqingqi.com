import type { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";

/**
 * The kind of thing a route documents, and the outer level of the route map.
 * It answers "what am I looking at": a token page, a component page, or the raw
 * layer underneath both.
 */
export type DesignSystemSectionId =
  "overview" | "foundations" | "components" | "buildingBlocks";

/**
 * The inner level of the route map: what a component is for, or what a
 * foundation decides. `"buildingBlocks"` is short enough to read as one list.
 */
export type DesignSystemCategoryId =
  | "basics"
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
   * names a visitor arrives with, deliberately including the ones the system
   * does not use — searching "tag" or "pill" should land on Button and teach the
   * word the system actually uses.
   */
  keywords?: readonly string[];
  /**
   * Set when the route has a Lab at `<path>/lab`. The Lab is not a nav entry
   * and not an overview tile, so the flag is the only place it is registered.
   */
  lab?: true;
}

/** A route's two views: its documentation, and its Lab. */
export type DesignSystemView = "docs" | "lab";

/** Union of every registered path — lets consumers type copy maps for exhaustiveness. */
export type DesignSystemPath = (typeof DESIGN_SYSTEM_ROUTES)[number]["path"];

/**
 * Just the paths of the given sections, so the illustration map can be total
 * over them and a new route there without art fails to compile.
 */
export type DesignSystemSectionPath<S extends DesignSystemSectionId> = Extract<
  (typeof DESIGN_SYSTEM_ROUTES)[number],
  { section: S }
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
