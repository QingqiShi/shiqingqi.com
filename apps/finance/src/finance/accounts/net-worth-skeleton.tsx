"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { listRowTokens } from "@tuja/ui/components/list.stylex";
import {
  NavigationSplitView,
  UnlessStacked,
} from "@tuja/ui/components/navigation-split-view";
import { sidebarEdge } from "@tuja/ui/components/navigation-split-view.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import type { NetWorthHeadlineForm } from "./net-worth-headline.tsx";

const GROUP_ROWS = [3, 4];

/** `/` before it can show: the same columns, title, figures, trend and Groups of accounts, as blocks. */
export function NetWorthSkeleton() {
  return (
    <div aria-busy>
      <NavigationSplitView
        linkStatus={null}
        sidebar={{
          href: "",
          label: t({ en: "Net worth", zh: "净资产" }),
          node: (
            <div css={[stack.item, sidebarEdge.text]}>
              <FiguresSkeleton form="label" />
              <ActionsSkeleton />
              <GroupsSkeleton form="sidebar" />
            </div>
          ),
        }}
        content={{
          label: t({ en: "Household", zh: "家庭" }),
          accessory: <FinanceAddButton />,
          node: (
            <div css={stack.group}>
              <div css={stack.item}>
                <div css={[cluster.item, styles.header]}>
                  <Heading level={2} look="h3">
                    {t({ en: "Household", zh: "家庭" })}
                  </Heading>
                  <Skeleton width="20rem" height={controlHeight.sm} />
                </div>
                <Skeleton width="100%" shape="control" css={styles.chart} />
              </div>
              <div css={styles.cards}>
                <UnlessStacked>
                  <Skeleton width="100%" height="10rem" shape="control" />
                </UnlessStacked>
                <Skeleton width="100%" height="10rem" shape="control" />
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
}

function FiguresSkeleton({ form }: { form: NetWorthHeadlineForm }) {
  return (
    <div css={[styles.lines, form === "label" && styles.figures]}>
      {form === "label" ? (
        <h1 css={[typeRole.label, styles.label]}>
          {t({ en: "Net worth · household", zh: "净资产 · 家庭" })}
        </h1>
      ) : null}
      <Skeleton width="8rem" height="1.8rem" />
      <Skeleton width={form === "page" ? "18rem" : "16rem"} height="1.25rem" />
      {form === "page" ? <Skeleton width="16rem" height="1.25rem" /> : null}
    </div>
  );
}

function ActionsSkeleton() {
  return (
    <div css={cluster.tight}>
      <Skeleton width="9rem" height={controlHeight.sm} />
      <Skeleton width="5.5rem" height={controlHeight.sm} />
    </div>
  );
}

function GroupsSkeleton({ form }: { form: "sidebar" | "card" }) {
  return (
    <div css={stack.group}>
      {GROUP_ROWS.map((rows, group) => {
        const accounts = Array.from({ length: rows }, (_, index) => {
          return (
            <ListRow
              key={index}
              leading={<Skeleton width="2rem" height="2rem" />}
              detail={<Skeleton width="5rem" height=".875rem" />}
              value={
                <Skeleton
                  width={form === "card" ? "5.5rem" : "5rem"}
                  height="1.25rem"
                />
              }
            >
              <Skeleton
                width={form === "card" ? "8rem" : "7rem"}
                height="1.25rem"
              />
            </ListRow>
          );
        });
        return (
          <div key={group} css={stack.tight}>
            <div css={[cluster.item, styles.groupHeader]}>
              <Skeleton width="4rem" height="1rem" />
              <Skeleton width="5rem" height="1rem" />
            </div>
            <List
              form={form === "card" ? "card" : "plain"}
              density={form === "card" ? "regular" : "compact"}
            >
              {accounts}
            </List>
          </div>
        );
      })}
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
    color: color.mutedForeground,
  },
  chart: {
    blockSize: { default: "15rem", [breakpoints.md]: "18.75rem" },
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
    gap: rhythm.item,
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  // The box of the headline's plate in the sidebar.
  figures: {
    marginInline: `calc(-1 * ${listRowTokens.plateInset})`,
    paddingBlock: space._2,
    paddingInline: listRowTokens.plateInset,
  },
  groupHeader: {
    justifyContent: "space-between",
    blockSize: "2.125rem",
  },
});
