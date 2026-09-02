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
 * Localized names live in `../route-copy/`, not here. The i18n `t()` transform
 * compiles to a React hook (`useI18nLookup`) inside client files and to a
 * `server-only` lookup (`__i18n_lookup`) inside server files, so a module that
 * calls `t()` cannot be imported by both the client nav and the server overview
 * page — one side always gets the wrong (or a build-breaking) runtime. The copy
 * is therefore resolved once on the server and passed to the client consumers as
 * props; keeping this module free of `t()` also lets the sitemap-coverage test
 * import it without pulling in the i18n runtime. `keywords` is the one string
 * field that lives here, and it is never rendered — see its doc below.
 */

import type { DesignSystemRoute } from "./types.ts";

const ROUTES = [
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
  // Directly under Progressive blur, which it is one case of: the same
  // treatment, at the edge of a scroll region rather than around a floating
  // element.
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/scroll-mask",
    keywords: [
      "fade",
      "edge fade",
      "scroll shadow",
      "gradient mask",
      "overflow",
      "scroller",
    ],
  },
  // The third of the blur family, and the one that moves: Scroll mask holds at
  // a scroller's edge, this holds a row of controls over the page it blurs.
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/sticky-controls",
    keywords: [
      "sticky",
      "filter bar",
      "toolbar",
      "pinned",
      "stuck",
      "chrome",
      "controls",
    ],
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

/**
 * Every registered route, in the order the nav and overview present them. The
 * `as const satisfies` pair above checks each entry and catches a misspelled
 * key; intersecting each literal entry with `DesignSystemRoute` here is what
 * makes the optional `category` and `keywords` reachable at all, which they are
 * not on a bare union of literal object types. The literal paths and sections
 * survive the intersection, so `DesignSystemPath` still resolves to a union.
 */
export const DESIGN_SYSTEM_ROUTES: readonly (DesignSystemRoute &
  (typeof ROUTES)[number])[] = ROUTES;
