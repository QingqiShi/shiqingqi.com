"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm } from "@tuja/ui/tokens.stylex";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import { TransactionRowSkeleton } from "./transaction-row-skeleton.tsx";

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

/** `/transactions` before it can show: the same title, fields, filters and list, as blocks. */
export function TransactionsSkeleton() {
  return (
    <div aria-busy>
      <NavigationStack
        label={t({ en: "Transactions", zh: "交易" })}
        accessory={<FinanceAddButton />}
        css={pageColumn.list}
      >
        <ListSkeleton />
      </NavigationStack>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div css={stack.group}>
      <div css={stack.item}>
        <div css={styles.titleRow}>
          <div css={stack.tight}>
            <Heading level={1} look="h3">
              {t({ en: "Transactions", zh: "交易" })}
            </Heading>
            <Skeleton width="16rem" height="1.25rem" />
          </div>
          <Skeleton
            width="4.75rem"
            height={controlHeight.md}
            shape="control"
            css={styles.wideOnly}
          />
        </div>
        <Skeleton width="100%" height={controlHeight.md} shape="control" />
        <div css={stack.tight}>
          <Skeleton width="100%" height={controlHeight.md} shape="control" />
          <div css={[cluster.tight, styles.narrowOnly]}>
            {NARROW_FILTERS.map((width, index) => (
              <Skeleton
                key={index}
                width={width}
                height={controlHeight.sm}
                shape="round"
              />
            ))}
          </div>
          <div css={[cluster.tight, styles.wideOnly]}>
            {WIDE_FILTERS.map((width, index) => (
              <Skeleton
                key={index}
                width={width}
                height={controlHeight.sm}
                shape="round"
              />
            ))}
          </div>
        </div>
      </div>
      <div css={[plainList.list, listSurface.plain]}>
        <Skeleton width="100%" height="2.625rem" shape="control" />
        <div css={[plainList.row, styles.day]}>
          <Skeleton width="8rem" height="1.125rem" />
          <Skeleton width="7rem" height="1rem" />
        </div>
        {Array.from({ length: ROWS }, (_, index) => (
          <TransactionRowSkeleton
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
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: rhythm.item,
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
