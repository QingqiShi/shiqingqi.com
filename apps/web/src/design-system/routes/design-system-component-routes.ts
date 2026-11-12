import type { DesignSystemRoute } from "./types.ts";

/**
 * The Components section of the route map, in the order the nav and the
 * overview present them. `design-system-routes.ts` spreads it into the
 * whole map between Foundations and Building blocks; that file says how to
 * add a page.
 */
export const DESIGN_SYSTEM_COMPONENT_ROUTES = [
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
    path: "/design-system/components/page-header",
    keywords: ["page title", "header", "eyebrow", "hero", "h1", "actions"],
  },
  {
    section: "components",
    category: "content",
    path: "/design-system/components/code-block",
    lab: true,
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
    keywords: ["dropdown", "popup", "menu item", "sheet", "context menu"],
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
    path: "/design-system/components/prompt-field",
    keywords: ["prompt", "chat", "composer", "ask", "send", "input", "form"],
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
    path: "/design-system/components/radio-group",
    keywords: ["radio", "radio button", "choice", "option", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/filter-chips",
    keywords: ["chips", "filter", "pill", "tag", "facet", "count", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/slider",
    lab: true,
    keywords: ["range", "track", "thumb", "scrub", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/setting-row",
    keywords: ["settings", "preferences", "setting list", "toggle", "form"],
  },
  {
    section: "components",
    category: "forms",
    path: "/design-system/components/form-footer",
    keywords: ["submit", "save", "cancel", "actions", "sticky", "form"],
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
    keywords: ["label", "status dot", "meta line", "tag", "count", "pill"],
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
    category: "dataDisplay",
    path: "/design-system/components/stat",
    keywords: ["stat group", "kpi", "metric", "figure", "number", "summary"],
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
    path: "/design-system/components/empty-state",
    keywords: ["empty", "blank", "zero state", "no results", "placeholder"],
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
    path: "/design-system/components/columns",
    keywords: ["grid", "layout", "two column", "sidebar", "aside", "split"],
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
    lab: true,
    keywords: ["backdrop", "blur", "frosted", "scrim", "floating", "dim"],
  },
  // Directly under Progressive blur, which it is one case of: the same
  // treatment, at the edge of a scroll region rather than around a floating
  // element.
  {
    section: "components",
    category: "surfaces",
    path: "/design-system/components/scroll-mask",
    lab: true,
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
    lab: true,
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
    lab: true,
    keywords: ["shell", "header", "footer", "page", "reading"],
  },
  {
    section: "components",
    category: "shells",
    path: "/design-system/components/tab-view",
    lab: true,
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
    lab: true,
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
] as const satisfies readonly DesignSystemRoute[];
