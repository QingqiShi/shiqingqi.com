"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath, normalizePath } from "#src/utils/pathname.ts";

interface NavItem {
  label: string;
  /** Locale-agnostic path; resolved per-locale at render and matched for active state. */
  path: string;
}

interface NavGroup {
  /** Section heading shown on the desktop rail; omitted for the ungrouped overview. */
  label: string | null;
  items: NavItem[];
}

export function DesignSystemNav() {
  const locale = useLocale();
  const current = normalizePath(usePathname());

  // Labels resolve through `t()` directly in render (a fixed call order keeps
  // the client i18n hooks stable); the render below maps over the resolved
  // strings. Add a foundation or component by extending this list — the rail,
  // active state, and mobile bar all follow automatically.
  const groups: NavGroup[] = [
    {
      label: null,
      items: [
        { label: t({ en: "Overview", zh: "概览" }), path: "/design-system" },
      ],
    },
    {
      label: t({ en: "Foundations", zh: "基础" }),
      items: [
        {
          label: t({ en: "Color", zh: "颜色" }),
          path: "/design-system/foundations/color",
        },
        {
          label: t({ en: "Typography", zh: "排版" }),
          path: "/design-system/foundations/typography",
        },
        {
          label: t({ en: "Elevation", zh: "阴影层级" }),
          path: "/design-system/foundations/elevation",
        },
      ],
    },
    {
      label: t({ en: "Components", zh: "组件" }),
      items: [
        {
          label: t({ en: "Divider", zh: "分隔线" }),
          path: "/design-system/components/divider",
        },
        {
          label: t({ en: "Badge", zh: "徽章" }),
          path: "/design-system/components/badge",
        },
      ],
    },
  ];

  return (
    <nav
      css={styles.nav}
      aria-label={t({ en: "Design system", zh: "设计系统" })}
    >
      {/* The pill chrome lives on the <nav> while this inner element owns the
          horizontal scroll. Keeping the background off the scroll container
          stops macOS/iOS momentum overscroll from dragging the pill's surface
          away and exposing the page canvas at the edge. */}
      <div css={styles.scroller}>
        {groups.map((group) => (
          <div key={group.label ?? "overview"} css={styles.group}>
            {group.label ? (
              <span css={styles.groupLabel}>{group.label}</span>
            ) : null}
            {group.items.map((item) => {
              const active = current === item.path;
              return (
                <Link
                  key={item.path}
                  href={getLocalePath(item.path, locale)}
                  aria-current={active ? "page" : undefined}
                  css={[
                    transition.colors,
                    styles.link,
                    active && styles.linkActive,
                  ]}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

const styles = stylex.create({
  nav: {
    minInlineSize: 0,
    maxInlineSize: "100%",
    // Reads as a floating pill bar when collapsed on mobile, then dissolves into
    // the page so the rail sits flush in its column on wider viewports. The
    // chrome stays here (a non-scrolling element) so momentum overscroll on the
    // inner scroller can't pull the surface away from its edges.
    paddingBlock: { default: space._1, [breakpoints.md]: 0 },
    paddingInline: { default: space._1, [breakpoints.md]: 0 },
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.md]: "transparent",
    },
    borderRadius: { default: border.radius_round, [breakpoints.md]: 0 },
    boxShadow: { default: shadow._2, [breakpoints.md]: "none" },
  },
  scroller: {
    display: "flex",
    flexDirection: { default: "row", [breakpoints.md]: "column" },
    gap: space._1,
    minInlineSize: 0,
    // Horizontal scroll for the collapsed mobile bar; the vertical rail lets its
    // links flow naturally.
    overflowX: { default: "auto", [breakpoints.md]: "visible" },
    overscrollBehaviorX: "contain",
    scrollbarWidth: "none",
  },
  group: {
    // On mobile the group box dissolves so every item flows into the single
    // horizontal bar; on the desktop rail it stacks its label above its links.
    display: { default: "contents", [breakpoints.md]: "flex" },
    flexDirection: "column",
    gap: space._1,
  },
  groupLabel: {
    display: { default: "none", [breakpoints.md]: "block" },
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
