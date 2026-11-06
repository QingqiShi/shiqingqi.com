/**
 * The single source of truth for the design-system route map — which routes
 * exist, the order they appear in, the section and category each belongs to,
 * and the extra words a search should find them by.
 *
 * Add, remove, or reorder a route HERE and every structural consumer follows:
 * the nav rail (`design-system-nav.tsx`), the overview grid
 * (`app/[locale]/design-system/page.tsx` and `overview-browser.tsx`), and the
 * sitemap (`app/sitemap.ts`).
 *
 * Localized names live in `../route-copy/`, not here. The i18n `t()` transform
 * compiles to a React hook (`useI18nTranslations`) inside client files and to a
 * `server-only` lookup (`__i18n_lookup`) inside server files, so a module that
 * calls `t()` cannot be imported by both the client nav and the server overview
 * page — one side always gets the wrong (or a build-breaking) runtime. The copy
 * is therefore resolved once on the server and passed to the client consumers as
 * props; keeping this module free of `t()` also lets the sitemap import it
 * without pulling in the i18n runtime. `keywords` is the one string
 * field that lives here, and it is never rendered — see its doc below.
 */

import type { DesignSystemRoute } from "./types.ts";

const ROUTES = [
  { section: "overview", path: "/design-system" },
  // In the overview section, not in Foundations: it is the first page to
  // read, about the whole system, so the rail lists it right under Overview.
  {
    section: "overview",
    path: "/design-system/get-started",
    keywords: [
      "start",
      "begin",
      "intro",
      "layers",
      "install",
      "setup",
      "package",
      "publish",
      "coming soon",
      "开始",
      "入门",
      "安装",
    ],
  },
  // Foundations splits the same way Components does, and for the same reason:
  // ten in a row is past what a visitor can scan. Basics is where a reader
  // starts; Visual decides what a surface looks like; Behaviour decides how it
  // treats the person in front of it.
  {
    section: "foundations",
    category: "basics",
    path: "/design-system/foundations/principles",
    keywords: [
      "principles",
      "philosophy",
      "values",
      "guidelines",
      "tenets",
      "原则",
      "理念",
    ],
  },
  {
    section: "foundations",
    category: "basics",
    path: "/design-system/foundations/customization",
    keywords: [
      "customisation",
      "custom",
      "configuration",
      "slot",
      "escape hatch",
      "override",
      "extend",
    ],
  },
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
    path: "/design-system/foundations/layout",
    keywords: [
      "space",
      "spacing",
      "gap",
      "padding",
      "margin",
      "breakpoint",
      "container",
      "responsive",
      "z-index",
      "ratio",
    ],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/surfaces",
    keywords: [
      "border",
      "radius",
      "corner",
      "squircle",
      "stroke",
      "outline",
      "hairline",
      "shadow",
      "floating",
    ],
  },
  {
    section: "foundations",
    category: "visual",
    path: "/design-system/foundations/material",
    keywords: [
      "material",
      "texture",
      "wash",
      "glass",
      "surface",
      "blur",
      "质感",
      "纹理",
      "淡彩",
      "玻璃",
    ],
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
    keywords: [
      "a11y",
      "aria",
      "screen reader",
      "focus",
      "keyboard",
      "wcag",
      "copy",
      "label",
      "microcopy",
      "voice",
      "i18n",
      "truncate",
    ],
  },
  // "Content", not "Typography": Foundations already carries a Typography page,
  // and a Typography heading a few rows under a Typography tile reads as the
  // same page twice. The tokens live there; what you write copy with lives here.
  {
    section: "components",
    category: "content",
    path: "/design-system/components/text",
    lab: true,
    keywords: ["body", "copy", "paragraph", "prose", "label"],
  },
  {
    section: "components",
    category: "content",
    path: "/design-system/components/heading",
    lab: true,
    keywords: ["title", "h1", "h2", "headline"],
  },
  {
    section: "components",
    category: "content",
    path: "/design-system/components/code-block",
    keywords: ["code", "snippet", "syntax", "source", "usage", "runs"],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/button",
    lab: true,
    keywords: [
      "cta",
      "submit",
      "primary",
      "link",
      "anchor",
      "href",
      "navigate",
      "destination",
      "chip",
      "pill",
      "tag",
      "filter",
      "token",
      "action",
      "icon",
      "toolbar",
      "compact",
    ],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/menu-button",
    lab: true,
    keywords: ["dropdown", "popup", "menu", "sheet", "context menu"],
  },
  // Breadcrumb sits with the Actions rather than under a Navigation heading of
  // its own: it is a row of links the visitor operates, and one route cannot
  // carry a category — the route map requires two before a heading earns a slot.
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/breadcrumb",
    lab: true,
    keywords: ["trail", "navigation", "path", "hierarchy", "back", "crumbs"],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/pager",
    lab: true,
    keywords: [
      "pagination",
      "previous",
      "next",
      "prev next",
      "sequence",
      "navigation",
      "上一页",
      "下一页",
      "翻页",
    ],
  },
  {
    section: "components",
    category: "actions",
    path: "/design-system/components/nav-list",
    lab: true,
    keywords: [
      "navigation",
      "sidebar",
      "rail",
      "menu",
      "nav link",
      "nav group",
      "settings",
    ],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/text-field",
    lab: true,
    keywords: ["input", "field", "search box", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/textarea",
    lab: true,
    keywords: ["multiline", "input", "auto grow", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/select",
    lab: true,
    keywords: ["dropdown", "picker", "combobox", "options", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/checkbox",
    lab: true,
    keywords: ["tick", "checkmark", "indeterminate", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/switch",
    lab: true,
    keywords: ["toggle", "on off", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/segmented-control",
    lab: true,
    keywords: ["tabs", "toggle group", "radio", "switcher", "form"],
  },
  // Directly under Segmented control, which it is the roomy form of: the same
  // pick-one-from-a-visible-set job, sized for choices that need explaining.
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/option-card",
    lab: true,
    keywords: ["radio", "choice", "tile", "picker", "selectable", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/slider",
    lab: true,
    keywords: ["range", "track", "thumb", "scrub", "form"],
  },
  // Avatar and Badge are the inert markers that label a thing or report its
  // state. Badge sits here rather than beside Button in Actions on purpose: the
  // two are not variants of each other, and the split is the rule made visible.
  {
    section: "components",
    category: "dataDisplay",
    path: "/design-system/components/avatar",
    lab: true,
    keywords: ["profile", "monogram", "initials", "portrait", "picture"],
  },
  {
    section: "components",
    category: "dataDisplay",
    path: "/design-system/components/badge",
    lab: true,
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
    lab: true,
    keywords: ["data", "rows", "columns", "grid", "spreadsheet", "tabular"],
  },
  {
    section: "components",
    category: "dataDisplay",
    path: "/design-system/components/list",
    lab: true,
    keywords: ["rows", "list row", "settings", "caret", "divider", "items"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/callout",
    lab: true,
    keywords: ["alert", "banner", "notice", "message", "warning", "error"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/spinner",
    lab: true,
    keywords: ["loader", "loading", "progress", "busy"],
  },
  // Beside Spinner on purpose: the pair is one decision, and reading them apart
  // is what leads to a spinner standing in for a quantity the page already knows.
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/progress",
    lab: true,
    keywords: ["bar", "loading", "percent", "determinate", "meter"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/skeleton",
    lab: true,
    keywords: ["placeholder", "loading", "shimmer", "ghost"],
  },
  {
    section: "components",
    category: "feedback",
    path: "/design-system/components/toast",
    lab: true,
    keywords: ["snackbar", "notification", "undo", "flash message", "提示条"],
  },
  // Containers and the chrome between them. Sheet is a surface too — one that
  // arrives above the page — so it sits with the rest rather than alone.
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/card",
    lab: true,
    keywords: ["panel", "tile", "surface", "container"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/section",
    lab: true,
    keywords: ["block", "group", "fieldset"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/disclosure",
    lab: true,
    keywords: ["accordion", "collapse", "expand", "details", "summary"],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/sheet",
    lab: true,
    keywords: [
      "modal",
      "dialog",
      "popup",
      "lightbox",
      "overlay",
      "bottom sheet",
      "dim",
    ],
  },
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/popover",
    lab: true,
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
    lab: true,
    keywords: ["separator", "rule", "hr", "line"],
  },
  // The Shells. A Tab view holds an app's few top-level destinations, a
  // Navigation split view each screen in it and any page with a sidebar, and a
  // Header & footer layout a reading page with no sidebar.
  {
    section: "components",
    category: "shells",
    path: "/design-system/components/header-footer-layout",
    keywords: ["shell", "header", "footer", "page", "reading"],
  },
  {
    section: "components",
    category: "shells",
    path: "/design-system/components/tab-view",
    keywords: [
      "shell",
      "tabs",
      "navigation rail",
      "tab bar",
      "bottom navigation",
      "navigation bar",
      "mobile nav",
      "dock",
      "liquid",
      "app",
      "TabView",
      "SwiftUI",
    ],
  },
  {
    section: "components",
    category: "shells",
    path: "/design-system/components/navigation-split-view",
    keywords: [
      "master detail",
      "list detail",
      "columns",
      "split view",
      "sidebar",
      "drawer",
      "stack",
      "NavigationSplitView",
      "SwiftUI",
    ],
  },
  {
    section: "buildingBlocks",
    path: "/design-system/primitives",
    keywords: ["flex", "layout", "motion", "reset", "a11y", "stylex", "css"],
  },
  {
    section: "buildingBlocks",
    path: "/design-system/hooks",
    keywords: ["headless", "react", "state", "controlled", "focus"],
  },
  // An API rather than a foundation: the provider, the hooks that register an
  // element, and the effects they draw. It sits with the other building blocks.
  {
    section: "buildingBlocks",
    path: "/design-system/effect-layer",
    keywords: [
      "effects",
      "webgpu",
      "gpu",
      "canvas",
      "particles",
      "shader",
      "ripple",
      "dust",
      "black hole",
      "效果层",
    ],
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
