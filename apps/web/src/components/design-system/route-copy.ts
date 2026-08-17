/**
 * The counterpart to `routes.ts`: that module owns the structure of the
 * design-system route map, this one owns the words. Every place a route is
 * named — the nav rail, the overview grid, the page `h1`, the breadcrumb and
 * the page metadata — reads its name from here, so renaming a route is one
 * edit.
 *
 * Server-only, and that is the whole design. The i18n `t()` transform compiles
 * to a React hook inside `"use client"` files and to a `server-only` lookup
 * everywhere else, so one module cannot serve both graphs. Resolving the copy
 * here and handing it to the two client consumers (`design-system-nav.tsx`,
 * `overview-browser.tsx`) as props is what lets a single map cover both.
 */

import "server-only";
import { t } from "#src/i18n.ts";
import type {
  DesignSystemCategoryId,
  DesignSystemPath,
  DesignSystemSectionId,
} from "./routes.ts";

// Every export below is called from a server component or from
// `generateMetadata`, which is render scope the rule cannot follow across a
// module boundary.

/**
 * The name of every registered route, in registry order. Total over
 * `DesignSystemPath`, so a route added to `routes.ts` without a name here fails
 * to compile.
 */
export function getDesignSystemRouteLabels(): Record<DesignSystemPath, string> {
  return {
    "/design-system": t({ en: "Overview", zh: "概览" }),
    "/design-system/foundations/color": t({ en: "Colour", zh: "颜色" }),
    "/design-system/foundations/typography": t({
      en: "Typography",
      zh: "文字设计",
    }),
    "/design-system/foundations/spacing": t({ en: "Spacing", zh: "间距" }),
    "/design-system/foundations/borders": t({ en: "Borders", zh: "描边" }),
    "/design-system/foundations/layout": t({ en: "Layout", zh: "布局" }),
    "/design-system/foundations/iconography": t({
      en: "Iconography",
      zh: "图标",
    }),
    "/design-system/foundations/motion": t({ en: "Motion", zh: "动效" }),
    "/design-system/foundations/accessibility": t({
      en: "Accessibility",
      zh: "无障碍",
    }),
    "/design-system/foundations/voice": t({ en: "Voice", zh: "语气" }),
    "/design-system/components/text": t({ en: "Text", zh: "文本" }),
    "/design-system/components/heading": t({ en: "Heading", zh: "标题" }),
    "/design-system/components/button": t({ en: "Button", zh: "按钮" }),
    "/design-system/components/icon-button": t({
      en: "Icon button",
      zh: "图标按钮",
    }),
    "/design-system/components/menu-button": t({
      en: "Menu button",
      zh: "菜单按钮",
    }),
    "/design-system/components/chip": t({ en: "Chip", zh: "标签按钮" }),
    "/design-system/components/breadcrumb": t({
      en: "Breadcrumb",
      zh: "面包屑导航",
    }),
    "/design-system/components/text-field": t({
      en: "Text field",
      zh: "文本输入框",
    }),
    "/design-system/components/textarea": t({
      en: "Textarea",
      zh: "多行文本框",
    }),
    "/design-system/components/select": t({ en: "Select", zh: "下拉选择" }),
    "/design-system/components/checkbox": t({ en: "Checkbox", zh: "复选框" }),
    "/design-system/components/switch": t({ en: "Switch", zh: "开关" }),
    "/design-system/components/segmented-control": t({
      en: "Segmented control",
      zh: "分段控件",
    }),
    "/design-system/components/option-card": t({
      en: "Option card",
      zh: "选项卡片",
    }),
    "/design-system/components/slider": t({ en: "Slider", zh: "滑块" }),
    "/design-system/components/avatar": t({ en: "Avatar", zh: "头像" }),
    "/design-system/components/badge": t({ en: "Badge", zh: "徽章" }),
    "/design-system/components/table": t({ en: "Table", zh: "表格" }),
    "/design-system/components/callout": t({ en: "Callout", zh: "提示框" }),
    "/design-system/components/spinner": t({ en: "Spinner", zh: "加载指示器" }),
    "/design-system/components/progress": t({ en: "Progress", zh: "进度条" }),
    "/design-system/components/skeleton": t({ en: "Skeleton", zh: "骨架屏" }),
    "/design-system/components/card": t({ en: "Card", zh: "卡片" }),
    "/design-system/components/section": t({ en: "Section", zh: "区块" }),
    "/design-system/components/disclosure": t({
      en: "Disclosure",
      zh: "折叠面板",
    }),
    "/design-system/components/overlay": t({ en: "Overlay", zh: "覆盖层" }),
    "/design-system/components/popover": t({ en: "Popover", zh: "浮层" }),
    "/design-system/components/divider": t({ en: "Divider", zh: "分隔线" }),
    "/design-system/components/sidebar-layout": t({
      en: "Sidebar layout",
      zh: "侧边栏布局",
    }),
    "/design-system/components/header-footer-layout": t({
      en: "Header & footer layout",
      zh: "页头页脚布局",
    }),
    "/design-system/examples/movie-detail": t({
      en: "Movie details",
      zh: "影片详情",
    }),
    "/design-system/primitives": t({ en: "Primitives", zh: "原语" }),
    "/design-system/hooks": t({ en: "Hooks", zh: "钩子" }),
  };
}

/** One route's name — the page `h1`, its trailing crumb, and its metadata title. */
export function getDesignSystemRouteLabel(path: DesignSystemPath): string {
  return getDesignSystemRouteLabels()[path];
}

export interface DesignSystemGroupLabels {
  /** `null` for `overview`, which is a single unheaded link rather than a group. */
  sections: Record<DesignSystemSectionId, string | null>;
  categories: Record<DesignSystemCategoryId, string>;
}

/**
 * The headings for both levels of the route map, so the rail reads as a table of
 * contents for the overview page rather than a second, differently-worded index.
 */
export function getDesignSystemGroupLabels(): DesignSystemGroupLabels {
  return {
    sections: {
      overview: null,
      foundations: t({ en: "Foundations", zh: "基础" }),
      components: t({ en: "Components", zh: "组件" }),
      composition: t({ en: "Composition", zh: "组合" }),
    },
    categories: {
      visual: t({ en: "Visual", zh: "视觉" }),
      behaviour: t({ en: "Behaviour", zh: "行为" }),
      content: t({ en: "Content", zh: "内容" }),
      actions: t({ en: "Actions", zh: "操作控件" }),
      forms: t({ en: "Forms", zh: "表单控件" }),
      dataDisplay: t({ en: "Data display", zh: "信息展示" }),
      feedback: t({ en: "Feedback", zh: "反馈" }),
      surfaces: t({ en: "Surfaces", zh: "表面" }),
      shells: t({ en: "Page shells", zh: "页面骨架" }),
    },
  };
}
