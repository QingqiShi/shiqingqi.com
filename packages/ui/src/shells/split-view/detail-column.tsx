"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { Button } from "../../actions/button.tsx";
import { color } from "../../color.stylex.ts";
import { truncate } from "../../primitives/layout.stylex.ts";
import { typeRole } from "../../primitives/type.stylex.ts";
import { border, rhythm } from "../../tokens.stylex.ts";
import {
  splitViewQueries,
  splitViewWidths,
} from "../navigation-split-view-layout.stylex.ts";
import { columnStyles, contentStyles } from "./column.stylex.ts";
import { Column, type ColumnPage } from "./column.tsx";
import type { NavigationSplitViewDetail, SplitViewBackLink } from "./types.ts";

function DetailHeader({
  back,
  label,
  closeLabel,
  onClose,
}: {
  back: SplitViewBackLink;
  label: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div css={columnStyles.detailHeader}>
      <p css={[typeRole.label, columnStyles.breadcrumb]}>
        <span css={truncate.base}>{back.label}</span>
        <CaretRightIcon weight="bold" aria-hidden />
        <span css={columnStyles.breadcrumbCurrent}>{label}</span>
      </p>
      <Button
        look="ghost"
        size="sm"
        icon={<XIcon weight="bold" />}
        aria-label={closeLabel}
        onClick={onClose}
        css={columnStyles.close}
      />
    </div>
  );
}

/** @internal */
export function DetailColumn({
  detail,
  pages,
  sticks,
  isLeaving,
  close,
  onTakeOff,
}: {
  detail: NavigationSplitViewDetail;
  pages: readonly ColumnPage[];
  /** Whether the page scrolls the content, and the detail stays on the screen. */
  sticks: boolean;
  isLeaving: boolean;
  close: (() => void) | null;
  onTakeOff: (href: string) => void;
}) {
  return (
    <Column
      column="detail"
      pageScrolls={false}
      pageScroll="never"
      sticks={sticks}
      isShown
      label={detail.label}
      isLeaving={isLeaving}
      pages={pages}
      close={close}
      header={
        <DetailHeader
          back={detail.back}
          label={detail.label}
          closeLabel={detail.closeLabel}
          onClose={() => {
            onTakeOff(detail.back.href);
          }}
        />
      }
      css={[
        detailStyles.base,
        sticks && detailStyles.sticks,
        isLeaving && detailStyles.leaving,
      ]}
      contentCss={[contentStyles.gutters, detailStyles.content]}
    />
  );
}

const detailStyles = stylex.create({
  // Below `detailBeside`, the view shows the detail in a sheet. The column
  // shows there only for the first frame, before the view measures itself,
  // and it then stays out of the way.
  base: {
    display: { default: "none", [splitViewQueries.detailBeside]: "flex" },
    position: "relative",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: splitViewWidths.detail,
    borderInlineStartWidth: border.size_1,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.border,
  },
  // Where the page scrolls the content, the detail stays on the screen, as
  // tall as the screen, and scrolls its own content.
  sticks: {
    position: "sticky",
    insetBlockStart: 0,
    alignSelf: "flex-start",
    blockSize: "100dvh",
  },
  // The header above the scroller keeps clear of the safe area.
  content: {
    paddingBlockStart: rhythm.tight,
  },
  // The detail that goes takes no width at once, so the content takes its
  // width, and it shows over the end of the content only while it moves out.
  leaving: {
    marginInlineStart: `calc(-1 * ${splitViewWidths.detail})`,
    visibility: "hidden",
    // Over the content, which takes a fill while it moves.
    zIndex: 2,
  },
});
