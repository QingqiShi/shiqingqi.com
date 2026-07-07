"use client";

import * as stylex from "@stylexjs/stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath, normalizePath } from "#src/utils/pathname.ts";
import {
  type DesignSystemGroupId,
  type DesignSystemPath,
  getDesignSystemRouteGroups,
} from "./routes.ts";

interface DesignSystemNavProps {
  /**
   * Overrides the nav landmark's accessible name — needed when a second
   * instance renders on the same page (e.g. inside a showcase demo) so the
   * two landmarks stay distinguishable.
   */
  ariaLabel?: string;
}

export function DesignSystemNav({ ariaLabel }: DesignSystemNavProps) {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const groups = getDesignSystemRouteGroups();

  // The route map lives in routes.ts; the localized copy stays here because the
  // i18n transform compiles these `t()` calls to client hooks. They're resolved
  // up front in a fixed order (the render loop below only looks them up by key)
  // so the hook call order stays stable across renders. Only groups with routes
  // today carry a heading; the overview group is intentionally unheaded.
  const groupHeadings: Partial<Record<DesignSystemGroupId, string>> = {
    foundations: t({ en: "Foundations", zh: "基础" }),
    components: t({ en: "Components", zh: "组件" }),
    primitives: t({ en: "Primitives", zh: "原语" }),
    hooks: t({ en: "Hooks", zh: "钩子" }),
  };
  const itemLabels: Record<DesignSystemPath, string> = {
    "/design-system": t({ en: "Overview", zh: "概览" }),
    "/design-system/foundations/color": t({ en: "Color", zh: "颜色" }),
    "/design-system/foundations/typography": t({
      en: "Typography",
      zh: "排版",
    }),
    "/design-system/foundations/spacing": t({ en: "Spacing", zh: "间距" }),
    "/design-system/foundations/elevation": t({
      en: "Elevation",
      zh: "阴影层级",
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
    "/design-system/components/badge": t({ en: "Badge", zh: "徽章" }),
    "/design-system/components/callout": t({ en: "Callout", zh: "提示框" }),
    "/design-system/components/card": t({ en: "Card", zh: "卡片" }),
    "/design-system/components/spinner": t({ en: "Spinner", zh: "加载指示器" }),
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
    "/design-system/components/select": t({ en: "Select", zh: "下拉选择" }),
    "/design-system/components/overlay": t({ en: "Overlay", zh: "覆盖层" }),
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
      {groups.map((group) => {
        const heading = groupHeadings[group.group];
        return (
          <div key={group.group} css={styles.group}>
            {heading ? <span css={styles.groupLabel}>{heading}</span> : null}
            {group.paths.map((path) => {
              const active = current === path;
              return (
                <Link
                  key={path}
                  href={getLocalePath(path, locale)}
                  aria-current={active ? "page" : undefined}
                  css={[
                    transition.colors,
                    styles.link,
                    active && styles.linkActive,
                  ]}
                >
                  {itemLabels[path]}
                </Link>
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
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  groupLabel: {
    display: "block",
    marginBlockStart: space._3,
    paddingInline: space._3,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
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
