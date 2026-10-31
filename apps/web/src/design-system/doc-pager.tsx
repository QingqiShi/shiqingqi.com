import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import { getDesignSystemRouteNeighbours } from "#src/design-system/routes/get-design-system-route-neighbours.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { Link } from "#src/links/link.tsx";
import { readingColumn } from "./reading-column.stylex.ts";

interface DocPagerProps {
  path: DesignSystemPath;
}

/**
 * The links to the routes before and after this one in the nav rail, at the
 * end of the documentation, so a reader can go through the system page by page.
 * The Lab is a tool, not a page to read in sequence, so it has none.
 */
export function DocPager({ path }: DocPagerProps) {
  const { previous, next } = getDesignSystemRouteNeighbours(path);
  const locale = getLocale();

  return (
    <nav
      aria-label={t({ en: "Previous and next pages", zh: "上一页与下一页" })}
      css={styles.nav}
    >
      {previous === undefined ? null : (
        <PagerLink
          href={getLocalePath(previous, locale)}
          label={t({ en: "Previous", zh: "上一页" })}
          title={getDesignSystemRouteLabel(previous)}
          direction="previous"
        />
      )}
      {next === undefined ? null : (
        <PagerLink
          href={getLocalePath(next, locale)}
          label={t({ en: "Next", zh: "下一页" })}
          title={getDesignSystemRouteLabel(next)}
          direction="next"
        />
      )}
    </nav>
  );
}

interface PagerLinkProps {
  href: string;
  label: string;
  title: string;
  direction: "previous" | "next";
}

function PagerLink({ href, label, title, direction }: PagerLinkProps) {
  const isNext = direction === "next";
  const Icon = isNext ? CaretRightIcon : CaretLeftIcon;

  return (
    <Link
      href={href}
      aria-label={`${label} ${title}`}
      {...stylex.props(
        stack.text,
        corner.radius_1,
        a11y.focusRing,
        styles.link,
        isNext && styles.next,
        stylex.defaultMarker(),
      )}
    >
      <span css={[typeRole.label, styles.label]}>{label}</span>
      <span
        css={[
          typeRole.h3,
          row.inline,
          styles.title,
          isNext && styles.titleNext,
        ]}
      >
        <span css={styles.caret}>
          <Icon weight="bold" aria-hidden />
        </span>
        <span css={styles.titleText}>{title}</span>
      </span>
    </Link>
  );
}

const styles = stylex.create({
  // Two equal columns. Next stays in the end column when there is no
  // Previous, and a long title wraps in its half on a phone.
  nav: {
    marginBlockStart: rhythm.section,
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: rhythm.item,
  },
  // The padding keeps the focus ring off the text, and the margin takes the
  // padding back so the text lines up with the column.
  link: {
    minInlineSize: 0,
    gridColumn: 1,
    justifySelf: "start",
    alignItems: "flex-start",
    padding: space._0,
    margin: `calc(-1 * ${space._0})`,
    textDecorationLine: "none",
  },
  next: {
    gridColumn: 2,
    justifySelf: "end",
    alignItems: "flex-end",
    textAlign: "end",
  },
  label: {
    color: color.fgMuted,
  },
  title: {
    color: color.fg,
    minInlineSize: 0,
    alignItems: "flex-start",
  },
  // One line high, so the caret stays on the first line of a title that wraps.
  caret: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    blockSize: "1lh",
  },
  titleNext: {
    flexDirection: "row-reverse",
  },
  titleText: {
    minInlineSize: 0,
    textDecorationLine: {
      default: "none",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover")]: "underline",
      },
    },
  },
});
