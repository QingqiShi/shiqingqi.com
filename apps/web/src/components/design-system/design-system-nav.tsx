"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath, normalizePath } from "#src/utils/pathname.ts";
import { useDesignSystemGroupLabels } from "./group-labels.ts";
import {
  type DesignSystemPath,
  getDesignSystemRouteSections,
} from "./routes.ts";

interface DesignSystemNavProps {
  /**
   * Overrides the nav landmark's accessible name — needed when a second
   * instance renders on the same page (e.g. inside a showcase specimen) so the
   * two landmarks stay distinguishable.
   */
  ariaLabel?: string;
}

export function DesignSystemNav({ ariaLabel }: DesignSystemNavProps) {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const sections = getDesignSystemRouteSections();
  const labelId = useId();

  // The route map lives in routes.ts and the group headings in group-labels.ts;
  // the per-route copy stays here because the i18n transform compiles these
  // `t()` calls to client hooks. They're resolved up front in a fixed order (the
  // render loop below only looks them up by key) so the hook call order stays
  // stable across renders.
  const { sections: sectionLabels, categories: categoryLabels } =
    useDesignSystemGroupLabels();
  const itemLabels: Record<DesignSystemPath, string> = {
    "/design-system": t({ en: "Overview", zh: "概览" }),
    "/design-system/foundations/color": t({ en: "Colour", zh: "颜色" }),
    "/design-system/foundations/typography": t({
      en: "Typography",
      zh: "文字设计",
    }),
    "/design-system/foundations/spacing": t({ en: "Spacing", zh: "间距" }),
    "/design-system/foundations/elevation": t({
      en: "Elevation",
      zh: "层深",
    }),
    "/design-system/foundations/motion": t({ en: "Motion", zh: "动效" }),
    "/design-system/foundations/borders": t({
      en: "Borders",
      zh: "描边与圆角",
    }),
    "/design-system/foundations/layout": t({ en: "Layout", zh: "布局与断点" }),
    "/design-system/foundations/iconography": t({
      en: "Iconography",
      zh: "图标",
    }),
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
    "/design-system/components/badge": t({ en: "Badge", zh: "徽章" }),
    "/design-system/components/avatar": t({ en: "Avatar", zh: "头像" }),
    "/design-system/components/table": t({ en: "Table", zh: "表格" }),
    "/design-system/components/callout": t({ en: "Callout", zh: "提示框" }),
    "/design-system/components/card": t({ en: "Card", zh: "卡片" }),
    "/design-system/components/section": t({ en: "Section", zh: "区块" }),
    "/design-system/components/disclosure": t({
      en: "Disclosure",
      zh: "折叠面板",
    }),
    "/design-system/components/spinner": t({ en: "Spinner", zh: "加载指示器" }),
    "/design-system/components/progress": t({ en: "Progress", zh: "进度条" }),
    "/design-system/components/skeleton": t({ en: "Skeleton", zh: "骨架屏" }),
    "/design-system/components/divider": t({ en: "Divider", zh: "分隔线" }),
    "/design-system/components/switch": t({ en: "Switch", zh: "开关" }),
    "/design-system/components/text-field": t({
      en: "Text field",
      zh: "文本输入框",
    }),
    "/design-system/components/textarea": t({
      en: "Textarea",
      zh: "多行文本框",
    }),
    "/design-system/components/checkbox": t({ en: "Checkbox", zh: "复选框" }),
    "/design-system/components/segmented-control": t({
      en: "Segmented control",
      zh: "分段控件",
    }),
    "/design-system/components/option-card": t({
      en: "Option card",
      zh: "选项卡片",
    }),
    "/design-system/components/slider": t({ en: "Slider", zh: "滑块" }),
    "/design-system/components/select": t({ en: "Select", zh: "下拉选择" }),
    "/design-system/components/overlay": t({ en: "Overlay", zh: "覆盖层" }),
    "/design-system/components/popover": t({ en: "Popover", zh: "浮层" }),
    "/design-system/components/sidebar-layout": t({
      en: "Sidebar layout",
      zh: "侧边栏布局",
    }),
    "/design-system/components/header-footer-layout": t({
      en: "Header & footer layout",
      zh: "页头页脚布局",
    }),
    "/design-system/primitives": t({ en: "Primitives", zh: "原语" }),
    "/design-system/hooks": t({ en: "Hooks", zh: "钩子" }),
  };

  return (
    <nav
      css={styles.nav}
      aria-label={ariaLabel ?? t({ en: "Design system", zh: "设计系统" })}
    >
      {/* Two levels: what kind of thing a link is, then what job it does. Each
          is a labelled `role="group"` rather than a heading, so the structure
          reaches assistive tech without adding a second outline beside the
          page's own headings. */}
      {sections.map((section) => {
        const heading = sectionLabels[section.section];
        const sectionLabelId = `${labelId}-${section.section}`;
        return (
          <div
            key={section.section}
            css={styles.section}
            role={heading === null ? undefined : "group"}
            aria-labelledby={heading === null ? undefined : sectionLabelId}
          >
            {heading !== null && (
              <span id={sectionLabelId} css={styles.sectionLabel}>
                {heading}
              </span>
            )}
            {section.groups.map((group) => {
              const category = group.category;
              const categoryLabelId =
                category === undefined ? undefined : `${labelId}-${category}`;
              return (
                <div
                  key={category ?? section.section}
                  css={styles.group}
                  role={category === undefined ? undefined : "group"}
                  aria-labelledby={categoryLabelId}
                >
                  {category !== undefined && (
                    <span id={categoryLabelId} css={styles.categoryLabel}>
                      {categoryLabels[category]}
                    </span>
                  )}
                  {group.paths.map((path) => {
                    const active = current === path;
                    return (
                      <Link
                        key={path}
                        href={getLocalePath(path, locale)}
                        aria-current={active ? "page" : undefined}
                        // Inset ring: the rail scrolls the nav through a container
                        // that clips inline overflow, which would crop an outward one.
                        css={[
                          transition.colors,
                          styles.link,
                          active && styles.linkActive,
                          a11y.focusRingInset,
                        ]}
                      >
                        {itemLabels[path]}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

const styles = stylex.create({
  // A plain vertical list on every viewport — the shell's rail and drawer own
  // the surface chrome and the scrolling.
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    minInlineSize: 0,
    maxInlineSize: "100%",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  // The two labels carry the whole hierarchy, so they differ on every axis a
  // small label has: the section is uppercase, tracked out and full-strength;
  // the category is sentence case, untracked and subtle. Links stay flush with
  // both rather than indenting under the category — indentation would only
  // separate the component links from the foundation ones, which sit at the
  // same rank.
  sectionLabel: {
    display: "block",
    marginBlockStart: space._5,
    paddingInline: space._3,
    fontSize: font.uiOverline,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
    color: color.textMain,
  },
  categoryLabel: {
    display: "block",
    marginBlockStart: space._3,
    paddingInline: space._3,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    color: color.textSubtle,
  },
  link: {
    flexShrink: 0,
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  linkActive: {
    color: { default: color.accentText, ":hover": color.accentText },
    backgroundColor: {
      default: color.surfaceAccentSubtle,
      ":hover": color.surfaceAccentSubtle,
    },
    fontWeight: font.weight_6,
  },
});
