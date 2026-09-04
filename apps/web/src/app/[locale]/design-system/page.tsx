import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import {
  OverviewBrowser,
  type OverviewEntry,
} from "#src/components/design-system/overview-browser.tsx";
import { OverviewTile } from "#src/components/design-system/overview-tile.tsx";
import { getDesignSystemGroupLabels } from "#src/components/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteLabels } from "#src/components/design-system/route-copy/get-design-system-route-labels.ts";
import { DESIGN_SYSTEM_ROUTES } from "#src/components/design-system/routes/design-system-routes.ts";
import type { DesignSystemPath } from "#src/components/design-system/routes/types.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/get-locale-path.ts";

export default function DesignSystemOverview() {
  const locale = getLocale();
  const heading = t({ en: "Design System", zh: "设计系统" });
  const routeLabels = getDesignSystemRouteLabels();

  // Names come from `route-copy/` and structure from the route registry. The
  // blurbs stay here: they are what the index says about a route, and nothing
  // else renders them.
  const tileDescriptions: Record<DesignSystemPath, string> = {
    "/design-system": t({
      en: "The design system overview and index.",
      zh: "设计系统概览与索引。",
    }),
    "/design-system/foundations/color": t({
      en: "Ramps, background roles, and text roles.",
      zh: "色调阶梯、背景角色与文本角色。",
    }),
    "/design-system/foundations/typography": t({
      en: "Families, the type scale, weights, and heading and body styles.",
      zh: "字体、字号阶梯、字重，以及标题与正文样式。",
    }),
    "/design-system/foundations/spacing": t({
      en: "The rem-based spacing scale.",
      zh: "以 rem 为基准的间距阶梯。",
    }),
    "/design-system/foundations/motion": t({
      en: "Duration and easing tokens, transition and animation presets, and reduced-motion behaviour.",
      zh: "时长与缓动令牌、过渡与动画预设，以及减弱动效行为。",
    }),
    "/design-system/foundations/borders": t({
      en: "Border widths and the corner-radius scale.",
      zh: "描边宽度与圆角阶梯。",
    }),
    "/design-system/foundations/layout": t({
      en: "Breakpoints, container widths, control sizes, z-index layers, and aspect ratios.",
      zh: "断点、容器宽度、控件尺寸、层级与宽高比。",
    }),
    "/design-system/foundations/iconography": t({
      en: "Phosphor icon conventions: sizing, weight, and pairing with controls.",
      zh: "Phosphor 图标约定：尺寸、字重与控件搭配。",
    }),
    "/design-system/foundations/accessibility": t({
      en: "Naming, focus, keyboard models, contrast, and announcements.",
      zh: "无障碍名称、焦点、键盘模型、对比度与状态播报。",
    }),
    "/design-system/foundations/voice": t({
      en: "How the copy should read, and how much of it each component holds.",
      zh: "文案该怎么读起来，以及每个组件能装下多少。",
    }),
    "/design-system/components/text": t({
      en: "The body-copy type primitive: a four-step type scale, four foreground roles, and four weights.",
      zh: "正文文字排版基础组件：四档字阶、四种前景色角色与四种字重。",
    }),
    "/design-system/components/heading": t({
      en: "The heading primitive, with semantic level decoupled from visual size.",
      zh: "标题基础组件，语义层级与视觉字号相互独立。",
    }),
    "/design-system/components/button": t({
      en: "The primary action control, with variants and a press animation.",
      zh: "主要的操作控件，提供多种风格与按压动画。",
    }),
    "/design-system/components/menu-button": t({
      en: "A button that expands into a popup menu.",
      zh: "点击后展开为弹出菜单的按钮。",
    }),
    "/design-system/components/chip": t({
      en: "A compact interactive pill — a link or a button, never an inert label.",
      zh: "紧凑的可交互胶囊形控件——链接或按钮，绝非静态标签。",
    }),
    "/design-system/components/breadcrumb": t({
      en: "A trail of links back up the hierarchy, ending on the page you are reading.",
      zh: "沿层级向上回溯的链接路径，终点是当前所在页面。",
    }),
    "/design-system/components/badge": t({
      en: "Compact status and label indicators in the six Intents plus a default.",
      zh: "六种意图色加默认样式的紧凑状态与标签指示器。",
    }),
    "/design-system/components/avatar": t({
      en: "A portrait or monogram medallion with an optional corner badge.",
      zh: "头像或字母缩写徽章，可附带角标。",
    }),
    "/design-system/components/table": t({
      en: "A semantic data table in its own scrolling region, with tabular figures and a sticky head.",
      zh: "位于独立滚动区域的语义化数据表格，支持等宽数字与粘性表头。",
    }),
    "/design-system/components/callout": t({
      en: "An inline message box in six Intents for status and guidance.",
      zh: "六种意图色的行内消息框，用于状态与提示。",
    }),
    "/design-system/components/card": t({
      en: "A bordered surface container, static or interactive.",
      zh: "带描边的表面容器，支持静态或可交互两种形态。",
    }),
    "/design-system/components/section": t({
      en: "A labelled block of content with a quiet heading row.",
      zh: "带轻量标题行的内容区块。",
    }),
    "/design-system/components/disclosure": t({
      en: "An expand and collapse section, with a headless hook beneath it.",
      zh: "展开与折叠区块，底层提供无头钩子。",
    }),
    "/design-system/components/spinner": t({
      en: "An indeterminate loading indicator that respects reduced motion.",
      zh: "尊重减弱动效偏好的不确定加载指示器。",
    }),
    "/design-system/components/progress": t({
      en: "A determinate bar for a wait whose length the page already knows.",
      zh: "用于页面已知时长的等待过程的确定型进度条。",
    }),
    "/design-system/components/skeleton": t({
      en: "Placeholder shapes that hold space while content loads.",
      zh: "在内容加载时占位的骨架形状。",
    }),
    "/design-system/components/divider": t({
      en: "Horizontal, vertical, and decorative separators.",
      zh: "水平、垂直与装饰性分隔线。",
    }),
    "/design-system/components/switch": t({
      en: "A draggable, three-state on/off/indeterminate toggle.",
      zh: "可拖动的开启／关闭／未定三态开关。",
    }),
    "/design-system/components/text-field": t({
      en: "A single-line input with label, description, and error states.",
      zh: "带标签、描述与错误态的单行输入框。",
    }),
    "/design-system/components/textarea": t({
      en: "A multi-line input with optional auto-grow.",
      zh: "支持自动增高的多行输入框。",
    }),
    "/design-system/components/checkbox": t({
      en: "A checkbox with label, indeterminate, and error states.",
      zh: "带标签、未定态与错误态的复选框。",
    }),
    "/design-system/components/segmented-control": t({
      en: "A single-select track for two to four views of the same content.",
      zh: "用于同一内容二至四种视图的单选轨道。",
    }),
    "/design-system/components/option-card": t({
      en: "The roomy form of a single choice, for options that need explaining.",
      zh: "单选的宽裕形态，适合需要说明的选项。",
    }),
    "/design-system/components/slider": t({
      en: "A range input with a live readout, streaming moves and a single commit.",
      zh: "带实时读数的范围输入，持续报告移动并在结束时提交一次。",
    }),
    "/design-system/components/select": t({
      en: "A styled native select driven by options or custom children.",
      zh: "样式化的原生下拉选择，支持选项数组或自定义子元素。",
    }),
    "/design-system/components/overlay": t({
      en: "A full-screen modal surface with focus trapping.",
      zh: "带焦点捕获的全屏模态层。",
    }),
    "/design-system/components/popover": t({
      en: "A surface anchored to its trigger that flips away from the viewport edge.",
      zh: "锚定在触发元素上的浮层，会自动避开视口边缘翻转。",
    }),
    "/design-system/components/progressive-blur": t({
      en: "Progressively blurs the page behind a floating element, instead of dimming it.",
      zh: "在悬浮元素背后渐进虚化页面，而非将其压暗。",
    }),
    "/design-system/components/scroll-mask": t({
      en: "A scroll region whose content blurs on its way out of view at each edge it can still scroll to.",
      zh: "滚动区域在仍可继续滚动的每条边上，将移出视野的内容渐进虚化。",
    }),
    "/design-system/components/sticky-controls": t({
      en: "A row of page chrome parked under the header strip, blurring the page around its controls while it holds.",
      zh: "停在页头下方的一行页面控件，停住期间在控件周围渐进虚化页面。",
    }),
    "/design-system/components/sidebar-layout": t({
      en: "An app-density page shell with a sticky navigation rail and a mobile drawer.",
      zh: "带粘性导航侧栏与移动端抽屉的应用密度页面骨架。",
    }),
    "/design-system/components/header-footer-layout": t({
      en: "A reading-density page shell with floating header controls and an optional footer.",
      zh: "带悬浮页头控件与可选页脚的阅读密度页面骨架。",
    }),
    "/design-system/examples/movie-detail": t({
      en: "A whole movie-details screen built from nothing but this system.",
      zh: "一整个影片详情页面，完全由本系统搭建。",
    }),
    "/design-system/primitives": t({
      en: "Composable StyleX primitives — flex, layout, motion, reset, and accessibility.",
      zh: "可组合的 StyleX 原语——flex、布局、动效、重置与无障碍。",
    }),
    "/design-system/hooks": t({
      en: "Headless React hooks — controlled state, dialog focus, tactile press, and radiogroups.",
      zh: "无头 React 钩子——受控状态、对话框焦点、触感按压与单选组。",
    }),
  };

  // The overview lists everything except itself. Tiles are built here, on the
  // server, and handed to the browser as ready-made nodes: it only ever reorders
  // and filters them, so the two dozen live specimens never reach the client
  // bundle.
  const routes = DESIGN_SYSTEM_ROUTES.filter(
    (route) => route.path !== "/design-system",
  );
  const entries: OverviewEntry[] = routes.map((route) => ({
    path: route.path,
    label: routeLabels[route.path],
    tile: (
      <OverviewTile
        path={route.path}
        href={getLocalePath(route.path, locale)}
        label={routeLabels[route.path]}
        description={tileDescriptions[route.path]}
      />
    ),
  }));
  const collator = new Intl.Collator(locale);
  const alphabeticalOrder = entries
    .map((entry) => entry.path)
    .toSorted((a, b) => collator.compare(routeLabels[a], routeLabels[b]));

  return (
    <div css={styles.page}>
      <header css={styles.hero}>
        <h1 css={styles.heading}>{heading}</h1>
        <p css={styles.intro}>
          {t({
            en: "Tokens, primitives, and components that compose a refined visual language. Browse them by the job they do or by name — or search for the one you already have in mind.",
            zh: "构成精致视觉语言的设计令牌、原语与组件。可按用途或名称浏览，也可直接搜索你想找的内容。",
          })}
        </p>
      </header>

      <OverviewBrowser
        entries={entries}
        alphabeticalOrder={alphabeticalOrder}
        groupLabels={getDesignSystemGroupLabels()}
      />
    </div>
  );
}

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: space._8,
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    paddingBlockEnd: space._2,
  },
  heading: {
    margin: 0,
    fontSize: font.vpDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
    textWrap: "balance",
  },
  intro: {
    margin: 0,
    fontSize: font.vpHeading3,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "60ch",
    textWrap: "pretty",
  },
});
