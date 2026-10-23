"use client";

import * as stylex from "@stylexjs/stylex";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import type { DesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteSections } from "#src/design-system/routes/get-design-system-route-sections.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";

interface DesignSystemNavProps {
  /** Every route's name. Resolved on the server — see `route-copy/`. */
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

  const { sections: sectionLabels, categories: categoryLabels } = groupLabels;

  const links = (paths: readonly DesignSystemPath[]) =>
    paths.map((path) => (
      <NavLink
        key={path}
        href={getLocalePath(path, locale)}
        current={current === path}
      >
        {routeLabels[path]}
      </NavLink>
    ));

  return (
    <nav
      css={styles.nav}
      aria-label={ariaLabel ?? t({ en: "Design system", zh: "设计系统" })}
    >
      {/* Two levels: what kind of thing a link is, then what job it does. Each
          is a labelled `role="group"` rather than a heading, so the structure
          reaches assistive tech without adding a second outline beside the
          page's own headings. */}
      <NavList linkComponent={Link}>
        {sections.map((section) => (
          <NavGroup
            key={section.section}
            label={sectionLabels[section.section]}
          >
            {section.groups.map((group) =>
              group.category === undefined ? (
                <Fragment key={section.section}>{links(group.paths)}</Fragment>
              ) : (
                <NavGroup
                  key={group.category}
                  label={categoryLabels[group.category]}
                >
                  {links(group.paths)}
                </NavGroup>
              ),
            )}
          </NavGroup>
        ))}
      </NavList>
    </nav>
  );
}

const styles = stylex.create({
  // A plain vertical list on every viewport — the shell's rail and drawer own
  // the surface chrome and the scrolling.
  nav: {
    minInlineSize: 0,
    maxInlineSize: "100%",
  },
});
