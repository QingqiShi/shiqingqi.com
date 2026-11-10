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
 * To add a page: add its entry here (a component's in
 * `design-system-component-routes.ts`), its name to
 * `get-design-system-route-labels.ts`, its one sentence to
 * `get-design-system-route-descriptions.ts` (the overview tile, the link cards
 * and the page's meta description all read it), its art to
 * `tile-illustrations/` for a Foundations or Components route, and its
 * `page.tsx`, which passes the same path to `designSystemMetadata` and
 * `DocPage`. Those maps are total over `DesignSystemPath`, so a missed step or
 * a misspelled path fails to compile.
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

import { DESIGN_SYSTEM_COMPONENT_ROUTES } from "./design-system-component-routes.ts";
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
  {
    section: "overview",
    path: "/design-system/patterns",
    keywords: ["blocks", "templates", "examples", "screens", "模板"],
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
  ...DESIGN_SYSTEM_COMPONENT_ROUTES,
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
