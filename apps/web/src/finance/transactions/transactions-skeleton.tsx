"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import { TransactionFaceSkeleton } from "./transaction-face-skeleton.tsx";

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
const ROW_LINES = [
  { width: "7rem", height: "1.25rem" },
  { width: "11rem", height: "1rem" },
  { width: "6rem", height: ".875rem" },
];
const ROW_TRAILING = [{ width: "4rem", height: "1.25rem" }];

/** `/finance/transactions` before it can show: the same title, fields, filters and list, as blocks. */
export function TransactionsSkeleton() {
  return (
    <div aria-busy>
      <NavigationSplitView
        closeLabel={t({ en: "Close", zh: "关闭" })}
        content={{
          label: t({ en: "Transactions", zh: "交易" }),
          accessory: <FinanceAddButton />,
          node: <ListSkeleton />,
        }}
      />
    </div>
  );
}

function ListSkeleton() {
  return (
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
          <TransactionFaceSkeleton
            key={index}
            lines={ROW_LINES}
            trailing={ROW_TRAILING}
            css={styles.row}
          />
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  master: {
    inlineSize: "100%",
    maxInlineSize: "52rem",
    marginInline: "auto",
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
    blockSize: "4.75rem",
    marginBlockEnd: rhythm.inline,
  },
});
