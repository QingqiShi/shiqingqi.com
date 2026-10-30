"use client";

import type { Icon } from "@phosphor-icons/react";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { CardsIcon } from "@phosphor-icons/react/dist/ssr/Cards";
import { CubeIcon } from "@phosphor-icons/react/dist/ssr/Cube";
import { CursorClickIcon } from "@phosphor-icons/react/dist/ssr/CursorClick";
import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { LayoutIcon } from "@phosphor-icons/react/dist/ssr/Layout";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { PlugsIcon } from "@phosphor-icons/react/dist/ssr/Plugs";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { TableIcon } from "@phosphor-icons/react/dist/ssr/Table";
import { TextAaIcon } from "@phosphor-icons/react/dist/ssr/TextAa";
import { TextboxIcon } from "@phosphor-icons/react/dist/ssr/Textbox";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import type { DesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteSections } from "#src/design-system/routes/get-design-system-route-sections.ts";
import type {
  DesignSystemCategoryId,
  DesignSystemPath,
} from "#src/design-system/routes/types.ts";
import { Link } from "#src/links/link.tsx";

const CATEGORY_ICONS: Record<DesignSystemCategoryId, Icon> = {
  basics: BookOpenIcon,
  visual: PaletteIcon,
  behaviour: LightningIcon,
  content: TextAaIcon,
  actions: CursorClickIcon,
  forms: TextboxIcon,
  dataDisplay: TableIcon,
  feedback: BellIcon,
  surfaces: CardsIcon,
  shells: LayoutIcon,
};

/** The links that sit in a section directly, not in a category. */
const LINK_ICONS: Partial<Record<DesignSystemPath, Icon>> = {
  "/design-system": SquaresFourIcon,
  "/design-system/examples/movie-detail": FilmSlateIcon,
  "/design-system/primitives": CubeIcon,
  "/design-system/hooks": PlugsIcon,
  "/design-system/effect-layer": SparkleIcon,
};

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

  const links = (paths: readonly DesignSystemPath[], withIcons: boolean) =>
    paths.map((path) => {
      const LinkIcon = withIcons ? LINK_ICONS[path] : undefined;
      return (
        <NavLink
          key={path}
          href={getLocalePath(path, locale)}
          current={current === path}
          icon={LinkIcon ? <LinkIcon weight="bold" /> : undefined}
        >
          {routeLabels[path]}
        </NavLink>
      );
    });

  return (
    <nav
      css={styles.nav}
      aria-label={ariaLabel ?? t({ en: "Design system", zh: "设计系统" })}
    >
      {/* Two levels: what kind of thing a link is, then what job it does. The
          sections are labelled groups and the categories are toggle buttons,
          not headings, so the structure reaches assistive tech without adding
          a second outline beside the page's own headings. */}
      <NavList linkComponent={Link}>
        {sections.map((section) => (
          <NavGroup
            key={section.section}
            label={sectionLabels[section.section]}
          >
            {section.groups.map((group) => {
              if (group.category === undefined) {
                return (
                  <Fragment key={section.section}>
                    {links(group.paths, true)}
                  </Fragment>
                );
              }
              const CategoryIcon = CATEGORY_ICONS[group.category];
              return (
                <NavGroup
                  key={group.category}
                  label={categoryLabels[group.category]}
                  icon={<CategoryIcon weight="bold" />}
                  current={group.paths.some((path) => path === current)}
                >
                  {links(group.paths, false)}
                </NavGroup>
              );
            })}
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
