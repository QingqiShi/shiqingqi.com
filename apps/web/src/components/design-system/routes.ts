/**
 * The single source of truth for the design-system route map — which routes
 * exist, the order they appear in, the section and category each belongs to,
 * and the extra words a search should find them by.
 *
 * Add, remove, or reorder a route HERE and every structural consumer follows:
 * the nav rail (`design-system-nav.tsx`), the overview grid
 * (`app/[locale]/design-system/page.tsx` and `overview-browser.tsx`), and the
 * sitemap-coverage test.
 *
 * Localized names live in `route-copy.ts`, not here. The i18n `t()` transform
 * compiles to a React hook (`useI18nLookup`) inside client files and to a
 * `server-only` lookup (`__i18n_lookup`) inside server files, so a module that
 * calls `t()` cannot be imported by both the client nav and the server overview
 * page — one side always gets the wrong (or a build-breaking) runtime. The copy
 * is therefore resolved once on the server and passed to the client consumers as
 * props; keeping this module free of `t()` also lets the sitemap-coverage test
 * import it without pulling in the i18n runtime. `keywords` is the one string
 * field that lives here, and it is never rendered — see its doc below.
 */

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

/**
 * Every registered route, in the order the nav and overview present them. The
 * `as const satisfies` pair keeps the literal paths available as a union
 * (`DesignSystemPath`) while still checking each entry against
 * `DesignSystemRoute`.
 */
export const DESIGN_SYSTEM_ROUTES = [
  { section: "overview", path: "/design-system" },
  // Foundations splits the same way Components does, and for the same reason:
  // nine in a row is past what a visitor can scan. Six decide what a surface
  // looks like; three decide how it treats the person in front of it.
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/color",
    keywords: ["palette", "hue", "tone", "swatch", "theme", "contrast"],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/typography",
    keywords: ["font", "type scale", "weight", "leading", "tracking"],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/spacing",
    keywords: ["space", "gap", "padding", "margin", "rhythm"],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/borders",
    keywords: ["radius", "corner", "stroke", "outline", "hairline"],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/layout",
    keywords: ["breakpoint", "container", "responsive", "z-index", "ratio"],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/iconography",
    keywords: ["icon", "phosphor", "glyph", "svg"],
  },
  {
    section: "foundations",
    category: "behaviour",
    path: "/design-system/foundations/motion",
    keywords: ["animation", "transition", "easing", "duration", "reduced"],
  },
  {
    section: "foundations",
    category: "behaviour",
    path: "/design-system/foundations/accessibility",
    keywords: ["a11y", "aria", "screen reader", "focus", "keyboard", "wcag"],
  },
  {
    section: "foundations",
    category: "behaviour",
    path: "/design-system/foundations/voice",
    keywords: [
      "copy",
      "wording",
      "microcopy",
      "writing",
      "content",
      "label",
      "spelling",
      "dialect",
    ],
  },
  // "Content", not "Typography": Foundations already carries a Typography page,
  // and a Typography heading a few rows under a Typography tile reads as the
  // same page twice. The tokens live there; what you write copy with lives here.
  {
    section: "components",
    category: "content",
    path: "/design-system/components/text",
    keywords: ["body", "copy", "paragraph", "prose", "label"],
  },
  {
    section: "components",
    category: "content",
    path: "/design-system/components/heading",
    keywords: ["title", "h1", "h2", "headline"],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/button",
    keywords: ["cta", "submit", "primary", "action"],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/icon-button",
    keywords: ["icon", "toolbar", "compact"],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/menu-button",
    keywords: ["dropdown", "popup", "menu", "sheet", "context menu"],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/chip",
    keywords: ["pill", "tag", "filter", "token"],
  },
  // Breadcrumb sits with the Actions rather than under a Navigation heading of
  // its own: it is a row of links the visitor operates, and one route cannot
  // carry a category — the route map requires two before a heading earns a slot.
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/breadcrumb",
    keywords: ["trail", "navigation", "path", "hierarchy", "back", "crumbs"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/text-field",
    keywords: ["input", "field", "search box", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/textarea",
    keywords: ["multiline", "input", "auto grow", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/select",
    keywords: ["dropdown", "picker", "combobox", "options", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/checkbox",
    keywords: ["tick", "checkmark", "indeterminate", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/switch",
    keywords: ["toggle", "on off", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/segmented-control",
    keywords: ["tabs", "toggle group", "radio", "switcher", "form"],
  },
  // Directly under Segmented control, which it is the roomy form of: the same
  // pick-one-from-a-visible-set job, sized for choices that need explaining.
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/option-card",
    keywords: ["radio", "choice", "tile", "picker", "selectable", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/slider",
    keywords: ["range", "track", "thumb", "scrub", "form"],
  },
  // Avatar and Badge are the inert markers that label a thing or report its
  // state. Badge sits here rather than beside Chip in Actions on purpose: the
  // two are not variants of each other, and the split is the rule made visible.
  {
    section: "components",
    category: "dataDisplay",
    path: "/design-system/components/avatar",
    keywords: ["profile", "monogram", "initials", "portrait", "picture"],
  },
  {
    section: "components",
    category: "dataDisplay",
    path: "/design-system/components/badge",
    keywords: ["label", "status", "tag", "count", "pill"],
  },
  // Table joins the two markers above rather than opening a category of its
  // own: one route cannot carry a heading, and the obvious name for that
  // heading — Data — would promise the sorting, virtualisation and selection
  // this component deliberately does not have.
  {
    section: "components",
    category: "dataDisplay",
    path: "/design-system/components/table",
    keywords: ["data", "rows", "columns", "grid", "spreadsheet", "tabular"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/callout",
    keywords: ["alert", "banner", "notice", "message", "warning", "error"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/spinner",
    keywords: ["loader", "loading", "progress", "busy"],
  },
  // Beside Spinner on purpose: the pair is one decision, and reading them apart
  // is what leads to a spinner standing in for a quantity the page already knows.
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/progress",
    keywords: ["bar", "loading", "percent", "determinate", "meter"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/skeleton",
    keywords: ["placeholder", "loading", "shimmer", "ghost"],
  },
  // Containers and the chrome between them. Overlay is a surface too — one that
  // arrives above the page — so it sits with the rest rather than alone.
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/card",
    keywords: ["panel", "tile", "surface", "container"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/section",
    keywords: ["block", "group", "fieldset"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/disclosure",
    keywords: ["accordion", "collapse", "expand", "details", "summary"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/overlay",
    keywords: ["modal", "dialog", "popup", "lightbox"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/popover",
    keywords: ["tooltip", "dropdown", "flyout", "anchored", "floating"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/progressive-blur",
    keywords: ["backdrop", "blur", "frosted", "scrim", "floating", "dim"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/divider",
    keywords: ["separator", "rule", "hr", "line"],
  },
  // The two Shells. Every page gets exactly one of them.
  {
    section: "components",
    category: "shells",
    path: "/design-system/components/sidebar-layout",
    keywords: ["shell", "rail", "drawer", "navigation", "app"],
  },
  {
    section: "components",
    category: "shells",
    path: "/design-system/components/header-footer-layout",
    keywords: ["shell", "header", "footer", "page", "reading"],
  },
  // First in the section, ahead of the parts it is built from: the fastest
  // answer to "what does this add up to" is one screen that adds up.
  {
    section: "composition",
    path: "/design-system/examples/movie-detail",
    keywords: ["example", "exemplar", "screen", "page", "movie", "detail"],
  },
  {
    section: "composition",
    path: "/design-system/primitives",
    keywords: ["flex", "layout", "motion", "reset", "a11y", "stylex", "css"],
  },
  {
    section: "composition",
    path: "/design-system/hooks",
    keywords: ["headless", "react", "state", "controlled", "focus"],
  },
] as const satisfies readonly DesignSystemRoute[];

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

/**
 * The registry as a plain list. The `satisfies` above is what checks each entry
 * and catches a misspelled key; this view is what makes the optional `category`
 * reachable at all, which it is not on a union of literal object types.
 */
const ROUTES: readonly (DesignSystemRoute & { path: DesignSystemPath })[] =
  DESIGN_SYSTEM_ROUTES;

/**
 * Every registered path as plain strings. Safe to import from tests and the
 * sitemap coverage check without the i18n runtime.
 */
export const DESIGN_SYSTEM_PATHS: readonly DesignSystemPath[] = ROUTES.map(
  (route) => route.path,
);

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

export interface DesignSystemRouteGroup {
  /** Absent when the section lists its routes directly under its own heading. */
  category?: DesignSystemCategoryId;
  paths: DesignSystemPath[];
}

export interface DesignSystemRouteSection {
  section: DesignSystemSectionId;
  groups: DesignSystemRouteGroup[];
}

/**
 * The routes bucketed two levels deep and ordered for rendering: one entry per
 * section that has routes, each holding either a single uncategorized group or
 * one group per category that has routes. Pure (no i18n) so the client nav and
 * the server overview iterate identical structure and differ only in how they
 * resolve labels.
 */
export function getDesignSystemRouteSections(): DesignSystemRouteSection[] {
  return DESIGN_SYSTEM_SECTION_ORDER.map((section) => {
    const routes = ROUTES.filter((route) => route.section === section);
    const uncategorized = routes
      .filter((route) => route.category === undefined)
      .map((route) => route.path);
    const categorized = DESIGN_SYSTEM_CATEGORY_ORDER.map((category) => ({
      category,
      paths: routes
        .filter((route) => route.category === category)
        .map((route) => route.path),
    })).filter((group) => group.paths.length > 0);

    return {
      section,
      groups: [
        ...(uncategorized.length > 0 ? [{ paths: uncategorized }] : []),
        ...categorized,
      ],
    };
  }).filter((entry) => entry.groups.length > 0);
}

const ROUTE_BY_PATH = new Map(ROUTES.map((route) => [route.path, route]));

/**
 * Which section a route belongs to — what a breadcrumb puts between the
 * overview and the page. Pure, so a server page can resolve the section here
 * and its own copy separately.
 */
export function getDesignSystemRouteSection(
  path: DesignSystemPath,
): DesignSystemSectionId {
  // The fallback is unreachable while `path` comes from the route map, which
  // the type says and a `Map` lookup cannot; `overview` carries no crumb, so
  // an impossible path loses a level rather than naming the wrong one.
  return ROUTE_BY_PATH.get(path)?.section ?? "overview";
}

/**
 * Case- and separator-insensitive, so "text field", "textfield" and
 * "text-field" are one query. Chinese needs none of this and is unaffected.
 */
function foldForSearch(value: string) {
  return value.toLowerCase().replaceAll(/[\s\-_/&]+/gu, "");
}

/**
 * Whether a route answers a search. It matches the route's localised name, its
 * URL slug — which keeps the English name searchable in the Chinese locale —
 * and its `keywords`, so a visitor finds Overlay by typing "modal".
 */
export function matchesDesignSystemQuery(
  path: DesignSystemPath,
  label: string,
  query: string,
): boolean {
  const needle = foldForSearch(query);
  if (needle === "") return true;

  const slug = path.slice(path.lastIndexOf("/") + 1);
  const candidates = [
    label,
    slug,
    ...(ROUTE_BY_PATH.get(path)?.keywords ?? []),
  ];
  return candidates.some((candidate) =>
    foldForSearch(candidate).includes(needle),
  );
}
