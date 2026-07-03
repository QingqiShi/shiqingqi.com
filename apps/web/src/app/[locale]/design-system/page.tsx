import * as stylex from "@stylexjs/stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { ViewTransition } from "react";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

export default function DesignSystemOverview() {
  const locale = getLocale();
  const heading = t({ en: "Design System", zh: "设计系统" });

  const foundations = [
    {
      path: "/design-system/foundations/color",
      label: t({ en: "Color", zh: "颜色" }),
      description: t({
        en: "Tonal palettes, semantic backgrounds, and text roles.",
        zh: "色调阶梯、语义背景与文本角色。",
      }),
    },
    {
      path: "/design-system/foundations/typography",
      label: t({ en: "Typography", zh: "排版" }),
      description: t({
        en: "Families, the type scale, weights, and heading and body styles.",
        zh: "字体、字号阶梯、字重，以及标题与正文样式。",
      }),
    },
    {
      path: "/design-system/foundations/elevation",
      label: t({ en: "Elevation", zh: "阴影层级" }),
      description: t({
        en: "The shadow scale for layering surfaces above the page.",
        zh: "用于在页面之上叠放表面的阴影阶梯。",
      }),
    },
  ];

  const components = [
    {
      path: "/design-system/components/divider",
      label: t({ en: "Divider", zh: "分隔线" }),
      description: t({
        en: "Horizontal, vertical, and decorative separators.",
        zh: "水平、垂直与装饰性分隔线。",
      }),
    },
    {
      path: "/design-system/components/badge",
      label: t({ en: "Badge", zh: "徽章" }),
      description: t({
        en: "Compact status and label indicators across six tones.",
        zh: "六种色调的紧凑状态与标签指示器。",
      }),
    },
    {
      path: "/design-system/components/skeleton",
      label: t({ en: "Skeleton", zh: "骨架屏" }),
      description: t({
        en: "Placeholder shapes that hold space while content loads.",
        zh: "在内容加载时占位的骨架形状。",
      }),
    },
    {
      path: "/design-system/components/switch",
      label: t({ en: "Switch", zh: "开关" }),
      description: t({
        en: "A draggable, three-state on/off/indeterminate toggle.",
        zh: "可拖动的开启／关闭／未定三态开关。",
      }),
    },
    {
      path: "/design-system/components/button",
      label: t({ en: "Button", zh: "按钮" }),
      description: t({
        en: "The primary action control, with variants and a press animation.",
        zh: "主要的操作控件，提供多种风格与按压动画。",
      }),
    },
    {
      path: "/design-system/components/menu-button",
      label: t({ en: "Menu button", zh: "菜单按钮" }),
      description: t({
        en: "A button that expands into a popup menu.",
        zh: "点击后展开为弹出菜单的按钮。",
      }),
    },
    {
      path: "/design-system/components/overlay",
      label: t({ en: "Overlay", zh: "覆盖层" }),
      description: t({
        en: "A full-screen modal surface with focus trapping.",
        zh: "带焦点捕获的全屏模态层。",
      }),
    },
  ];

  const groups = [
    { title: t({ en: "Foundations", zh: "基础" }), entries: foundations },
    { title: t({ en: "Components", zh: "组件" }), entries: components },
  ];

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

      {groups.map((group) => (
        <section key={group.title} css={styles.group}>
          <h2 css={styles.groupTitle}>{group.title}</h2>
          <div css={styles.grid}>
            {group.entries.map((entry) => (
              <Link
                key={entry.path}
                href={getLocalePath(entry.path, locale)}
                css={[transition.colors, styles.tile]}
              >
                <span css={styles.tileName}>{entry.label}</span>
                <span css={styles.tileDescription}>{entry.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
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
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: { default: color.neutralBorder, ":hover": color.accentBorder },
    borderRadius: border.radius_3,
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgInteractiveHover,
    },
    textDecoration: "none",
  },
  tileName: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  tileDescription: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
  },
});
