"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import {
  NavigationSplitView,
  StackedOnly,
  UnlessFullSidebar,
  UnlessStacked,
} from "@tuja/ui/components/navigation-split-view";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";

const GROUP_ROWS = [3, 4];
const STRIP_ITEMS = 6;

/** `/finance` before it can show: the same columns, title, figures, trend and Groups of accounts, as blocks. */
export function NetWorthSkeleton() {
  return (
    <div aria-busy>
      <NavigationSplitView
        closeLabel={t({ en: "Close", zh: "关闭" })}
        sidebar={{
          label: t({ en: "Net worth", zh: "净资产" }),
          node: (
            <div css={stack.item}>
              <FiguresSkeleton />
              <ActionsSkeleton />
              <GroupsSkeleton />
            </div>
          ),
        }}
        collapsedSidebar={
          <div css={[stack.tight, styles.strip]}>
            {Array.from({ length: STRIP_ITEMS }, (_, index) => (
              <Skeleton
                key={index}
                width="2.25rem"
                height="2.25rem"
                css={corner.radius_3}
              />
            ))}
          </div>
        }
        content={{
          label: t({ en: "Household", zh: "家庭" }),
          accessory: <FinanceAddButton />,
          node: (
            <div css={stack.group}>
              <UnlessFullSidebar>
                <div css={stack.item}>
                  <FiguresSkeleton />
                  <ActionsSkeleton />
                </div>
              </UnlessFullSidebar>
              <div css={stack.item}>
                <div css={[cluster.item, styles.header]}>
                  <UnlessStacked>
                    <Heading level={2} look="h3">
                      {t({ en: "Household", zh: "家庭" })}
                    </Heading>
                  </UnlessStacked>
                  <Skeleton width="20rem" css={styles.button} />
                </div>
                <Skeleton width="100%" css={[corner.radius_3, styles.chart]} />
              </div>
              <div css={styles.cards}>
                <Skeleton width="100%" height="10rem" css={corner.radius_3} />
                <Skeleton width="100%" height="10rem" css={corner.radius_3} />
              </div>
              <StackedOnly>
                <GroupsSkeleton />
              </StackedOnly>
            </div>
          ),
        }}
      />
    </div>
  );
}

function FiguresSkeleton() {
  return (
    <div css={[styles.lines, styles.figures]}>
      <h1 css={[typeRole.label, styles.label]}>
        {t({ en: "Net worth · household", zh: "净资产 · 家庭" })}
      </h1>
      <Skeleton width="8rem" height="1.8rem" />
      <Skeleton width="16rem" height="1.25rem" />
    </div>
  );
}

function ActionsSkeleton() {
  return (
    <div css={[cluster.tight, styles.inset]}>
      <Skeleton width="9rem" css={styles.button} />
      <Skeleton width="5.5rem" css={styles.button} />
    </div>
  );
}

function GroupsSkeleton() {
  return (
    <div css={stack.group}>
      {GROUP_ROWS.map((rows, group) => (
        <div key={group} css={stack.tight}>
          <div css={[cluster.item, styles.groupHeader]}>
            <Skeleton width="4rem" height="1rem" />
            <Skeleton width="5rem" height="1rem" />
          </div>
          <div>
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} css={styles.account}>
                <Skeleton width="2rem" height="2rem" />
                <div css={[styles.lines, styles.grow]}>
                  <Skeleton width="7rem" height="1.25rem" />
                  <Skeleton width="5rem" height=".875rem" />
                </div>
                <Skeleton width="5rem" height="1.25rem" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  header: {
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
  label: {
    margin: 0,
    color: color.fgMuted,
  },
  inset: {
    paddingInline: space._2,
  },
  chart: {
    blockSize: { default: "15rem", [breakpoints.md]: "18.75rem" },
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
    gap: rhythm.item,
  },
  button: {
    height: controlHeight.sm,
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  figures: {
    padding: space._2,
  },
  strip: {
    alignItems: "center",
  },
  groupHeader: {
    justifyContent: "space-between",
    blockSize: "2.125rem",
  },
  account: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    blockSize: "3.5rem",
    paddingInline: space._2,
  },
  grow: {
    flexGrow: 1,
  },
});
