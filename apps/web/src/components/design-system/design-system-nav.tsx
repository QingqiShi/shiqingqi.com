"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath, normalizePath } from "#src/utils/pathname.ts";
import type { DesignSystemGroupLabels } from "./route-copy.ts";
import {
  type DesignSystemPath,
  getDesignSystemRouteSections,
} from "./routes.ts";

interface DesignSystemNavProps {
  /** Every route's name. Resolved on the server — see `route-copy.ts`. */
  routeLabels: Record<DesignSystemPath, string>;
  groupLabels: DesignSystemGroupLabels;
  /**
   * Overrides the nav landmark's accessible name — needed when a second
   * instance renders on the same page (e.g. inside a showcase specimen) so the
   * two landmarks stay distinguishable.
   */
  ariaLabel?: string;
}

export function DesignSystemNav({
  routeLabels,
  groupLabels,
  ariaLabel,
}: DesignSystemNavProps) {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const sections = getDesignSystemRouteSections();
  const labelId = useId();

  const { sections: sectionLabels, categories: categoryLabels } = groupLabels;

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
                          corner.radius_round,
                          styles.link,
                          active && styles.linkActive,
                          a11y.focusRingInset,
                        ]}
                      >
                        {routeLabels[path]}
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
