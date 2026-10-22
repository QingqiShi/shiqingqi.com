"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  border,
  color,
  controlHeight,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

const NARROW_FILTERS = ["5rem", "6rem", "4.25rem"];
const WIDE_FILTERS = [
  "5rem",
  "5.75rem",
  "2.75rem",
  "2.75rem",
  "5.75rem",
  "11.5rem",
  "8.25rem",
  "7.25rem",
];
const ROWS = 8;
const PANE_KEYS = 8;

/** `/finance/transactions` before it can show: the same title, fields, filters, list and pane, as blocks. */
export function TransactionsSkeleton() {
  return (
    <div css={styles.root} aria-busy>
      <div css={[stack.group, styles.master]}>
        <div css={stack.item}>
          <div css={styles.titleRow}>
            <div css={stack.tight}>
              <Heading level={1} look="h3" css={styles.title}>
                {t({ en: "Transactions", zh: "交易" })}
              </Heading>
              <Skeleton width="16rem" height="1.25rem" />
            </div>
            <Skeleton
              width="4.75rem"
              css={[corner.radius_3, styles.add, styles.wideOnly]}
            />
          </div>
          <Skeleton width="100%" css={styles.field} />
          <div css={stack.tight}>
            <Skeleton width="100%" css={styles.field} />
            <div css={[cluster.tight, styles.narrowOnly]}>
              {NARROW_FILTERS.map((width, index) => (
                <Skeleton
                  key={index}
                  width={width}
                  css={[corner.radius_round, styles.filter]}
                />
              ))}
            </div>
            <div css={[cluster.tight, styles.wideOnly]}>
              {WIDE_FILTERS.map((width, index) => (
                <Skeleton
                  key={index}
                  width={width}
                  css={[corner.radius_round, styles.filter]}
                />
              ))}
            </div>
          </div>
        </div>
        <div css={plainList.list}>
          <Skeleton width="100%" height="2.625rem" css={corner.radius_3} />
          <div css={[plainList.row, styles.day]}>
            <Skeleton width="8rem" height="1.125rem" />
            <Skeleton width="7rem" height="1rem" />
          </div>
          {Array.from({ length: ROWS }, (_, index) => (
            <div key={index} css={[plainList.row, styles.row]}>
              <Skeleton
                width="2.25rem"
                height="2.25rem"
                css={corner.radius_round}
              />
              <div css={[styles.lines, styles.grow]}>
                <Skeleton width="7rem" height="1.25rem" />
                <Skeleton width="11rem" height="1rem" />
                <Skeleton width="6rem" height=".875rem" />
              </div>
              <Skeleton width="4rem" height="1.25rem" />
            </div>
          ))}
        </div>
      </div>
      <div css={[corner.radius_4, stack.item, styles.pane]}>
        <Skeleton width="80%" height="1.5rem" />
        <div css={styles.lines}>
          {Array.from({ length: PANE_KEYS }, (_, index) => (
            <Skeleton key={index} width="60%" height="1.25rem" />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(22rem, 26rem)",
    },
    gap: rhythm.group,
    alignItems: "start",
  },
  master: {
    minInlineSize: 0,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: rhythm.item,
  },
  title: {
    margin: 0,
  },
  add: {
    height: controlHeight.md,
  },
  field: {
    height: controlHeight.md,
  },
  filter: {
    height: controlHeight.sm,
  },
  narrowOnly: {
    display: { default: "flex", [breakpoints.lg]: "none" },
  },
  wideOnly: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  day: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    blockSize: "2.75rem",
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.item,
    blockSize: "4.75rem",
    marginBlockEnd: rhythm.inline,
    paddingBlock: space._1,
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  grow: {
    flexGrow: 1,
  },
  pane: {
    display: { default: "none", [breakpoints.lg]: "flex" },
    padding: space._5,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
});
