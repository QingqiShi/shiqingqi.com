/**
 * The single source of truth for the design-system route map — which routes
 * exist, the order they appear in, and the group each belongs to.
 *
 * Add, remove, or reorder a route HERE and every structural consumer follows:
 * the nav rail (`design-system-nav.tsx`), the overview grid
 * (`app/[locale]/design-system/page.tsx`), and the sitemap-coverage test.
 *
 * Localized labels and descriptions are deliberately NOT stored here. The i18n
 * `t()` transform compiles to a React hook (`useI18nLookup`) inside client files
 * and to a `server-only` lookup (`__i18n_lookup`) inside server files, so a
 * module that calls `t()` cannot be imported by both the client nav and the
 * server overview page — one side always gets the wrong (or a build-breaking)
 * runtime. Each consumer therefore resolves copy with its own `t()` calls keyed
 * by `path`; keeping this module free of `t()` also lets the sitemap-coverage
 * test import it without pulling in the i18n runtime.
 */

/**
 * Group a design-system route falls into. Every group now has routes:
 * `"overview"`, `"foundations"`, `"components"`, `"primitives"`, and `"hooks"`.
 */
export type DesignSystemGroupId =
  | "overview"
  | "foundations"
  | "components"
  | "primitives"
  | "hooks";

export interface DesignSystemRoute {
  group: DesignSystemGroupId;
  /** Locale-agnostic path; resolved per-locale by the consumer at render. */
  path: string;
}

/**
 * Every registered route, in the order the nav and overview present them. The
 * `as const satisfies` pair keeps the literal paths available as a union
 * (`DesignSystemPath`) while still checking each entry against
 * `DesignSystemRoute`.
 */
export const DESIGN_SYSTEM_ROUTES = [
  { group: "overview", path: "/design-system" },
  { group: "foundations", path: "/design-system/foundations/color" },
  { group: "foundations", path: "/design-system/foundations/typography" },
  { group: "foundations", path: "/design-system/foundations/spacing" },
  { group: "foundations", path: "/design-system/foundations/elevation" },
  { group: "foundations", path: "/design-system/foundations/motion" },
  { group: "foundations", path: "/design-system/foundations/borders" },
  { group: "foundations", path: "/design-system/foundations/layout" },
  { group: "foundations", path: "/design-system/foundations/iconography" },
  { group: "components", path: "/design-system/components/text" },
  { group: "components", path: "/design-system/components/heading" },
  { group: "components", path: "/design-system/components/button" },
  { group: "components", path: "/design-system/components/icon-button" },
  { group: "components", path: "/design-system/components/menu-button" },
  { group: "components", path: "/design-system/components/badge" },
  { group: "components", path: "/design-system/components/callout" },
  { group: "components", path: "/design-system/components/spinner" },
  { group: "components", path: "/design-system/components/skeleton" },
  { group: "components", path: "/design-system/components/divider" },
  { group: "components", path: "/design-system/components/switch" },
  { group: "components", path: "/design-system/components/text-field" },
  { group: "components", path: "/design-system/components/textarea" },
  { group: "components", path: "/design-system/components/checkbox" },
  { group: "components", path: "/design-system/components/select" },
  { group: "components", path: "/design-system/components/overlay" },
  { group: "components", path: "/design-system/components/sidebar-layout" },
  { group: "primitives", path: "/design-system/primitives" },
  { group: "hooks", path: "/design-system/hooks" },
] as const satisfies readonly DesignSystemRoute[];

/** Union of every registered path — lets consumers type copy maps for exhaustiveness. */
export type DesignSystemPath = (typeof DESIGN_SYSTEM_ROUTES)[number]["path"];

/**
 * Every registered path as plain strings. Safe to import from tests and the
 * sitemap coverage check without the i18n runtime.
 */
export const DESIGN_SYSTEM_PATHS: readonly DesignSystemPath[] =
  DESIGN_SYSTEM_ROUTES.map((route) => route.path);

/**
 * Group render order. Groups with no routes are dropped by
 * `getDesignSystemRouteGroups`, so seeding future groups here is harmless.
 */
export const DESIGN_SYSTEM_GROUP_ORDER = [
  "overview",
  "foundations",
  "components",
  "primitives",
  "hooks",
] as const satisfies readonly DesignSystemGroupId[];

export interface DesignSystemRouteGroup {
  group: DesignSystemGroupId;
  paths: DesignSystemPath[];
}

/**
 * The routes bucketed by group and ordered for rendering — one entry per group
 * that has at least one route, in `DESIGN_SYSTEM_GROUP_ORDER`. Pure (no i18n) so
 * the client nav and the server overview iterate identical structure and differ
 * only in how they resolve labels.
 */
export function getDesignSystemRouteGroups(): DesignSystemRouteGroup[] {
  return DESIGN_SYSTEM_GROUP_ORDER.map((group) => ({
    group,
    paths: DESIGN_SYSTEM_ROUTES.filter((route) => route.group === group).map(
      (route) => route.path,
    ),
  })).filter((entry) => entry.paths.length > 0);
}
