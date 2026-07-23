// Foundation-card illustrations: eight soft-luminous SVG scenes in
// components/design-system/foundation-illustrations, each a StyleX component
// that reads a small shared contract set by the tile below and IlloLayer:
//   --ds-illo                    0 -> 1  aliveness on hover/focus (registered
//                                        <number> in global.css, so it animates)
//   --ds-illo-px / --ds-illo-py  0 -> 1  pointer position across the tile
//                                        (0.5 = centre), set by IlloLayer
import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { ViewTransition } from "react";
import { IlloLayer } from "#src/components/design-system/foundation-illustrations/illo-layer.tsx";
import { getFoundationIllustration } from "#src/components/design-system/foundation-illustrations/index.tsx";
import {
  type DesignSystemGroupId,
  type DesignSystemPath,
  getDesignSystemRouteGroups,
} from "#src/components/design-system/routes.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

export default function DesignSystemOverview() {
  const locale = getLocale();
  const heading = t({ en: "Design System", zh: "设计系统" });

  // Structure comes from the shared route registry; the localized copy stays
  // here because the i18n transform compiles these `t()` calls to the server
  // lookup, which the client nav can't share. The overview lists everything
  // except itself, so the `"overview"` group is dropped below.
  const cardGroups = getDesignSystemRouteGroups().filter(
    (group) => group.group !== "overview",
  );
  const groupHeadings: Partial<Record<DesignSystemGroupId, string>> = {
    foundations: t({ en: "Foundations", zh: "基础" }),
    components: t({ en: "Components", zh: "组件" }),
    primitives: t({ en: "Primitives", zh: "原语" }),
    hooks: t({ en: "Hooks", zh: "钩子" }),
  };
  const content: Record<
    DesignSystemPath,
    { label: string; description: string }
  > = {
    "/design-system": {
      label: t({ en: "Overview", zh: "概览" }),
      description: t({
        en: "The design system overview and index.",
        zh: "设计系统概览与索引。",
      }),
    },
    "/design-system/foundations/color": {
      label: t({ en: "Color", zh: "颜色" }),
      description: t({
        en: "Tonal palettes, semantic backgrounds, and text roles.",
        zh: "色调阶梯、语义背景与文本角色。",
      }),
    },
    "/design-system/foundations/typography": {
      label: t({ en: "Typography", zh: "文字设计" }),
      description: t({
        en: "Families, the type scale, weights, and heading and body styles.",
        zh: "字体、字号阶梯、字重，以及标题与正文样式。",
      }),
    },
    "/design-system/foundations/spacing": {
      label: t({ en: "Spacing", zh: "间距" }),
      description: t({
        en: "The rem-based spacing scale.",
        zh: "以 rem 为基准的间距阶梯。",
      }),
    },
    "/design-system/foundations/elevation": {
      label: t({ en: "Elevation", zh: "阴影层级" }),
      description: t({
        en: "The shadow scale for layering surfaces above the page.",
        zh: "用于在页面之上叠放表面的阴影阶梯。",
      }),
    },
    "/design-system/foundations/motion": {
      label: t({ en: "Motion", zh: "动效" }),
      description: t({
        en: "Duration and easing tokens, transition and animation presets, and reduced-motion behavior.",
        zh: "时长与缓动令牌、过渡与动画预设，以及减弱动效行为。",
      }),
    },
    "/design-system/foundations/borders": {
      label: t({ en: "Borders", zh: "描边与圆角" }),
      description: t({
        en: "Border widths and the corner-radius scale.",
        zh: "描边宽度与圆角阶梯。",
      }),
    },
    "/design-system/foundations/layout": {
      label: t({ en: "Layout", zh: "布局与断点" }),
      description: t({
        en: "Breakpoints, container widths, control sizes, z-index layers, and aspect ratios.",
        zh: "断点、容器宽度、控件尺寸、层级与宽高比。",
      }),
    },
    "/design-system/foundations/iconography": {
      label: t({ en: "Iconography", zh: "图标" }),
      description: t({
        en: "Phosphor icon conventions: sizing, weight, and pairing with controls.",
        zh: "Phosphor 图标约定：尺寸、字重与控件搭配。",
      }),
    },
    "/design-system/components/text": {
      label: t({ en: "Text", zh: "文本" }),
      description: t({
        en: "The body-copy type primitive: a four-step ramp, four tones, and four weights.",
        zh: "正文文字排版基础组件：四档字阶、四种色调与四种字重。",
      }),
    },
    "/design-system/components/heading": {
      label: t({ en: "Heading", zh: "标题" }),
      description: t({
        en: "The heading primitive, with semantic level decoupled from visual size.",
        zh: "标题基础组件，语义层级与视觉字号相互独立。",
      }),
    },
    "/design-system/components/button": {
      label: t({ en: "Button", zh: "按钮" }),
      description: t({
        en: "The primary action control, with variants and a press animation.",
        zh: "主要的操作控件，提供多种风格与按压动画。",
      }),
    },
    "/design-system/components/icon-button": {
      label: t({ en: "Icon button", zh: "图标按钮" }),
      description: t({
        en: "A compact, icon-only button with a required accessible name.",
        zh: "紧凑的纯图标按钮，须提供无障碍名称。",
      }),
    },
    "/design-system/components/menu-button": {
      label: t({ en: "Menu button", zh: "菜单按钮" }),
      description: t({
        en: "A button that expands into a popup menu.",
        zh: "点击后展开为弹出菜单的按钮。",
      }),
    },
    "/design-system/components/badge": {
      label: t({ en: "Badge", zh: "徽章" }),
      description: t({
        en: "Compact status and label indicators across seven tones.",
        zh: "七种色调的紧凑状态与标签指示器。",
      }),
    },
    "/design-system/components/callout": {
      label: t({ en: "Callout", zh: "提示框" }),
      description: t({
        en: "An inline message box in six tones for status and guidance.",
        zh: "六种色调的行内消息框，用于状态与提示。",
      }),
    },
    "/design-system/components/card": {
      label: t({ en: "Card", zh: "卡片" }),
      description: t({
        en: "A bordered surface container, static or interactive.",
        zh: "带描边的表面容器，支持静态或可交互两种形态。",
      }),
    },
    "/design-system/components/spinner": {
      label: t({ en: "Spinner", zh: "加载指示器" }),
      description: t({
        en: "An indeterminate loading indicator that respects reduced motion.",
        zh: "尊重减弱动效偏好的不确定加载指示器。",
      }),
    },
    "/design-system/components/skeleton": {
      label: t({ en: "Skeleton", zh: "骨架屏" }),
      description: t({
        en: "Placeholder shapes that hold space while content loads.",
        zh: "在内容加载时占位的骨架形状。",
      }),
    },
    "/design-system/components/divider": {
      label: t({ en: "Divider", zh: "分隔线" }),
      description: t({
        en: "Horizontal, vertical, and decorative separators.",
        zh: "水平、垂直与装饰性分隔线。",
      }),
    },
    "/design-system/components/switch": {
      label: t({ en: "Switch", zh: "开关" }),
      description: t({
        en: "A draggable, three-state on/off/indeterminate toggle.",
        zh: "可拖动的开启／关闭／未定三态开关。",
      }),
    },
    "/design-system/components/text-field": {
      label: t({ en: "Text field", zh: "文本输入框" }),
      description: t({
        en: "A single-line input with label, description, and error states.",
        zh: "带标签、描述与错误态的单行输入框。",
      }),
    },
    "/design-system/components/textarea": {
      label: t({ en: "Textarea", zh: "多行文本框" }),
      description: t({
        en: "A multi-line input with optional auto-grow.",
        zh: "支持自动增高的多行输入框。",
      }),
    },
    "/design-system/components/checkbox": {
      label: t({ en: "Checkbox", zh: "复选框" }),
      description: t({
        en: "A checkbox with label, indeterminate, and error states.",
        zh: "带标签、未定态与错误态的复选框。",
      }),
    },
    "/design-system/components/select": {
      label: t({ en: "Select", zh: "下拉选择" }),
      description: t({
        en: "A styled native select driven by options or custom children.",
        zh: "样式化的原生下拉选择，支持选项数组或自定义子元素。",
      }),
    },
    "/design-system/components/overlay": {
      label: t({ en: "Overlay", zh: "覆盖层" }),
      description: t({
        en: "A full-screen modal surface with focus trapping.",
        zh: "带焦点捕获的全屏模态层。",
      }),
    },
    "/design-system/components/sidebar-layout": {
      label: t({ en: "Sidebar layout", zh: "侧边栏布局" }),
      description: t({
        en: "An app-density page shell with a sticky navigation rail and a mobile drawer.",
        zh: "带粘性导航侧栏与移动端抽屉的应用密度页面骨架。",
      }),
    },
    "/design-system/components/header-footer-layout": {
      label: t({ en: "Header & footer layout", zh: "页头页脚布局" }),
      description: t({
        en: "A reading-density page shell with a fixed header and an optional footer.",
        zh: "带固定页头与可选页脚的阅读密度页面骨架。",
      }),
    },
    "/design-system/primitives": {
      label: t({ en: "Primitives", zh: "原语" }),
      description: t({
        en: "Composable StyleX recipes — flex, layout, motion, reset, and accessibility.",
        zh: "可组合的 StyleX 配方——flex、布局、动效、重置与无障碍。",
      }),
    },
    "/design-system/hooks": {
      label: t({ en: "Hooks", zh: "钩子" }),
      description: t({
        en: "Headless React hooks — controlled state, dialog focus, tactile press, and radiogroups.",
        zh: "无头 React 钩子——受控状态、对话框焦点、触感按压与单选组。",
      }),
    },
  };

  return (
    <div css={styles.page}>
      <header css={styles.hero}>
        <ViewTransition name={`project-card-name-${heading}`}>
          <h1 css={styles.heading}>{heading}</h1>
        </ViewTransition>
        <p css={styles.intro}>
          {t({
            en: "Tokens, primitives, and components that compose a refined visual language. Browse the foundations the system is built on, then the components built from them.",
            zh: "构成精致视觉语言的设计令牌、原语与组件。先浏览系统赖以构建的基础，再查看由其构成的组件。",
          })}
        </p>
      </header>

      {cardGroups.map((group) => {
        const title = groupHeadings[group.group];
        return (
          <section key={group.group} css={styles.group}>
            {title ? <h2 css={styles.groupTitle}>{title}</h2> : null}
            <div css={styles.grid}>
              {group.paths.map((path) => {
                const entry = content[path];
                const illustration = getFoundationIllustration(path);
                return (
                  <Link
                    key={path}
                    href={getLocalePath(path, locale)}
                    // Marks the pointer-tracked tile so IlloLayer finds it
                    // without assuming the tile renders as an <a>.
                    data-illo-tile={illustration ? "" : undefined}
                    css={[
                      cardSurface.base,
                      cardSurface.interactive,
                      styles.tile,
                      illustration ? styles.tileIllustrated : transition.colors,
                    ]}
                  >
                    {illustration ? (
                      <IlloLayer>{illustration}</IlloLayer>
                    ) : null}
                    <span css={styles.tileName}>{entry.label}</span>
                    <span css={styles.tileDescription}>
                      {entry.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
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
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  groupTitle: {
    margin: 0,
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingSnug,
    color: color.textMain,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: space._3,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._4,
    textDecoration: "none",
  },
  // Foundation tiles carry a soft-luminous illustration. `--ds-illo` (0 -> 1) is
  // the aliveness signal every illustration reads; it is registered as an
  // animatable `<number>` in global.css, so it interpolates over the transition
  // below and blooms the art from monochrome to colour. The colour transitions
  // are folded in here because this rule owns the `transition` shorthand (it
  // replaces the shared `transition.colors` for these tiles).
  tileIllustrated: {
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    // Foundations tiles carry a bottom-anchored illustration and stand taller
    // than the plain cards so the art has room to read (a ~3:2 surface, close to
    // the reference mockups) instead of being letterboxed into a right-hand strip.
    minBlockSize: "184px",
    justifyContent: "flex-start",
    "--ds-illo": { default: "0", ":hover": "1", ":focus-visible": "1" },
    // The colour parts mirror `transition.colors` exactly (same duration/easing
    // tokens); only the bespoke `--ds-illo` interpolation is appended here.
    transition: {
      default: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}, --ds-illo 600ms ${easing.entrance}`,
      [motionConstants.REDUCED_MOTION]: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}, --ds-illo 1ms ${easing.linear}`,
    },
  },
  tileName: {
    position: "relative",
    zIndex: 1,
    fontSize: font.uiHeading3,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  tileDescription: {
    position: "relative",
    zIndex: 1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
  },
});
