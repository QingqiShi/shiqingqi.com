import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { color, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { Button } from "./button.tsx";
import type { LinkSlot } from "./link-provider.tsx";

/** One page on either side of the current page. */
export interface PagerPage {
  /** Destination of the link. */
  href: string;
  /** The small line above the title, such as "Previous". */
  label: string;
  /** The title of the page the link goes to. */
  title: string;
}

interface PagerProps {
  /**
   * Accessible name for the `<nav>` landmark. Required: the package ships no
   * i18n, so the consumer supplies the localised string.
   *
   * @zh 为 `<nav>` 地标提供的可访问名称。因该包不内置 i18n 而设为必填，本地化字符串由使用方提供。
   */
  "aria-label": string;
  /**
   * The page before this one. Omit it on the first page.
   *
   * @zh 当前页的上一页。在第一页上省略。
   */
  previous?: PagerPage;
  /**
   * The page after this one. Omit it on the last page. The link stays in the
   * end column when there is no `previous`.
   *
   * @zh 当前页的下一页。在最后一页上省略。没有 `previous` 时，该链接仍留在末尾一列。
   */
  next?: PagerPage;
  /**
   * Link Slot: renders each anchor. Defaults to the link of the nearest
   * `LinkProvider`, or a plain `<a>` without one.
   *
   * @zh 链接插槽：负责渲染每个锚点。默认使用最近的 `LinkProvider` 提供的链接；没有 provider 时使用原生 `<a>`。
   */
  linkComponent?: LinkSlot;
  /**
   * StyleX styles merged over the landmark's own, for its place on the page.
   *
   * @zh 合并在地标自身样式之上的 StyleX 样式，用于决定它在页面上的位置。
   */
  css?: StyleProp;
}

/**
 * The links to the pages before and after this one, at the end of a page in a
 * sequence. Each link is one target, drawn as a ghost button.
 */
export function Pager({
  "aria-label": ariaLabel,
  previous,
  next,
  linkComponent,
  css,
}: PagerProps) {
  if (!previous && !next) return null;

  return (
    <nav aria-label={ariaLabel} css={[styles.nav, css]}>
      {previous && (
        <PagerLink
          page={previous}
          direction="previous"
          linkComponent={linkComponent}
        />
      )}
      {next && (
        <PagerLink page={next} direction="next" linkComponent={linkComponent} />
      )}
    </nav>
  );
}

interface PagerLinkProps {
  page: PagerPage;
  direction: "previous" | "next";
  linkComponent: PagerProps["linkComponent"];
}

function PagerLink({ page, direction, linkComponent }: PagerLinkProps) {
  const isNext = direction === "next";
  const Caret = isNext ? CaretRightIcon : CaretLeftIcon;

  return (
    <Button
      look="ghost"
      href={page.href}
      aria-label={`${page.label} ${page.title}`}
      linkComponent={linkComponent}
      css={[
        corner.radius_2,
        styles.link,
        isNext && styles.linkNext,
        stylex.defaultMarker(),
      ]}
    >
      <span css={[styles.grid, isNext && styles.gridNext]}>
        <span css={[typeRole.label, styles.label]}>{page.label}</span>
        <span css={[typeRole.h4, styles.caret]}>
          <Caret weight="bold" aria-hidden />
        </span>
        <span css={[typeRole.h4, styles.title]}>{page.title}</span>
      </span>
    </Button>
  );
}

const hang = space._1;

const styles = stylex.create({
  // Full width in a flex parent too, so `next` alone keeps the end column.
  nav: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    columnGap: rhythm.item,
    inlineSize: "100%",
  },
  // The fill hangs outside the column, so at rest the carets line up with the
  // column and not with an edge that shows only on hover.
  link: {
    gridColumn: 1,
    justifySelf: "start",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    minInlineSize: 0,
    maxInlineSize: `calc(100% + ${hang})`,
    paddingBlock: space._1,
    paddingInline: hang,
    marginInlineStart: `calc(-1 * ${hang})`,
  },
  linkNext: {
    gridColumn: 2,
    justifySelf: "end",
    justifyContent: "flex-end",
    marginInlineStart: 0,
    marginInlineEnd: `calc(-1 * ${hang})`,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gridTemplateAreas: `". label" "caret title"`,
    columnGap: rhythm.inline,
    rowGap: rhythm.tight,
    minInlineSize: 0,
  },
  gridNext: {
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gridTemplateAreas: `"label ." "title caret"`,
    textAlign: "end",
  },
  label: {
    gridArea: "label",
    color: {
      default: color.fgMuted,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover")]: color.fg,
      },
    },
  },
  title: {
    gridArea: "title",
    color: color.fg,
  },
  // One line high, so the caret stays on the first line of a title that wraps.
  caret: {
    gridArea: "caret",
    display: "flex",
    alignItems: "center",
    blockSize: "1lh",
  },
});
