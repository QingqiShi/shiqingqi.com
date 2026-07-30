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
 * Group a design-system route falls into. The component routes are bucketed by
 * what a visitor is trying to do — write copy, offer an action, collect input,
 * report state, build a page — rather than piled into one `"components"` list;
 * a single flat group of two dozen entries is a wall, not a map. Two rules keep
 * it honest:
 *
 * 1. Every group carries at least two routes, so no heading ever sits over a
 *    lone card that repeats it (the old `"primitives"` and `"hooks"` groups each
 *    did — they are now one `"composition"` group).
 * 2. Group ids describe a job, never a directory. `/design-system/components/*`
 *    paths are spread across several groups on purpose; the URL is unchanged.
 *
 * Both rules are enforced by `routes.test.ts`.
 */
export type DesignSystemGroupId =
  | "overview"
  | "foundations"
  | "content"
  | "actions"
  | "forms"
  | "dataDisplay"
  | "feedback"
  | "surfaces"
  | "shells"
  | "composition";

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
  // "Content", not "Typography": Foundations already carries a Typography page,
  // and a Typography heading four rows under a Typography tile reads as the same
  // page twice. The tokens live there; what you write copy with lives here.
  { group: "content", path: "/design-system/components/text" },
  { group: "content", path: "/design-system/components/heading" },
  { group: "actions", path: "/design-system/components/button" },
  { group: "actions", path: "/design-system/components/icon-button" },
  { group: "actions", path: "/design-system/components/menu-button" },
  { group: "actions", path: "/design-system/components/chip" },
  { group: "forms", path: "/design-system/components/text-field" },
  { group: "forms", path: "/design-system/components/textarea" },
  { group: "forms", path: "/design-system/components/select" },
  { group: "forms", path: "/design-system/components/checkbox" },
  { group: "forms", path: "/design-system/components/switch" },
  { group: "forms", path: "/design-system/components/segmented-control" },
  // Avatar and Badge are the inert markers that label a thing or report its
  // state. Badge sits here rather than beside Chip on purpose: the two are not
  // variants of each other, and the split is the distinction made visible.
  { group: "dataDisplay", path: "/design-system/components/avatar" },
  { group: "dataDisplay", path: "/design-system/components/badge" },
  { group: "feedback", path: "/design-system/components/callout" },
  { group: "feedback", path: "/design-system/components/spinner" },
  { group: "feedback", path: "/design-system/components/skeleton" },
  // Containers and the chrome between them. Overlay is a surface too — one that
  // arrives above the page — so it sits with the rest rather than alone.
  { group: "surfaces", path: "/design-system/components/card" },
  { group: "surfaces", path: "/design-system/components/section" },
  { group: "surfaces", path: "/design-system/components/disclosure" },
  { group: "surfaces", path: "/design-system/components/overlay" },
  { group: "surfaces", path: "/design-system/components/divider" },
  // The two Shells. Every page gets exactly one of them.
  { group: "shells", path: "/design-system/components/sidebar-layout" },
  {
    group: "shells",
    path: "/design-system/components/header-footer-layout",
  },
  { group: "composition", path: "/design-system/primitives" },
  { group: "composition", path: "/design-system/hooks" },
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
 * Group render order: the tokens first, then the components a page is assembled
 * from — what you write with, what the visitor operates, what reports back, what
 * holds it all — and the raw composition layer last. Groups with no routes are
 * dropped by `getDesignSystemRouteGroups`, so seeding future groups here is
 * harmless.
 */
export const DESIGN_SYSTEM_GROUP_ORDER = [
  "overview",
  "foundations",
  "content",
  "actions",
  "forms",
  "dataDisplay",
  "feedback",
  "surfaces",
  "shells",
  "composition",
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
