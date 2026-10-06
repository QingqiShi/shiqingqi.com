import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { CardDescription, CardTitle } from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { getDesignSystemRouteDescriptions } from "#src/design-system/route-copy/get-design-system-route-descriptions.ts";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { getLocale } from "#src/i18n/server-locale.ts";

interface RouteLink {
  path: DesignSystemPath;
  /** Defaults to the route's label. */
  title?: string;
  /** Defaults to the route's description. */
  body?: string;
}

interface RouteLinkCardsProps {
  links: readonly RouteLink[];
  /** The column count from the `md` breakpoint up; one column below it. */
  columns: 2 | 3;
}

/** A grid of cards, each linking to another design-system page. */
export function RouteLinkCards({ links, columns }: RouteLinkCardsProps) {
  const locale = getLocale();
  const descriptions = getDesignSystemRouteDescriptions();
  return (
    <div css={[styles.grid, columns === 3 ? styles.three : styles.two]}>
      {links.map(({ path, title, body }) => (
        <Link
          key={path}
          href={getLocalePath(path, locale)}
          {...stylex.props(
            flex.col,
            cardSurface.base,
            cardSurface.interactive,
            transition.colors,
            styles.card,
          )}
        >
          <CardTitle>{title ?? getDesignSystemRouteLabel(path)}</CardTitle>
          <CardDescription>{body ?? descriptions[path]}</CardDescription>
        </Link>
      ))}
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space._2,
  },
  two: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
  },
  three: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
    },
  },
  // Matches the padding of `Card`, which `cardSurface` does not carry.
  card: {
    gap: space._0,
    paddingBlock: space._3,
    paddingInline: space._4,
    textDecoration: "none",
    color: "inherit",
    minInlineSize: 0,
  },
});
