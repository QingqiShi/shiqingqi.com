"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  border,
  color,
  controlSize,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

const GROUP_ROWS = [3, 4];

/** `/finance` before it can show: the same title, figures, trend and Groups of accounts, as blocks. */
export function NetWorthSkeleton() {
  return (
    <div css={styles.root} aria-busy>
      <div css={[stack.group, styles.master]}>
        <div css={stack.tight}>
          <div css={[cluster.item, styles.header]}>
            <Heading level={1} look="h3" css={styles.title}>
              {t({ en: "Net worth", zh: "净资产" })}
            </Heading>
            <div css={cluster.tight}>
              <Skeleton width="9rem" css={styles.button} />
              <Skeleton width="5.5rem" css={styles.button} />
            </div>
          </div>
          <div css={stack.item}>
            <div css={styles.lines}>
              <Skeleton width="8rem" height="1.8rem" />
              <Skeleton width="18rem" height="1.25rem" />
              <Skeleton width="16rem" height="1.25rem" />
            </div>
            <div css={[stack.item, styles.narrowOnly]}>
              <Skeleton width="100%" height="12.5rem" />
              <Skeleton width="100%" css={styles.button} />
            </div>
          </div>
        </div>
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
                    <Skeleton width="8rem" height="1.25rem" />
                    <Skeleton width="5rem" height=".875rem" />
                  </div>
                  <Skeleton width="5.5rem" height="1.25rem" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div css={[corner.radius_4, stack.item, styles.pane]}>
        <Skeleton width="60%" height="1rem" />
        <Skeleton width="100%" height="20rem" />
        <Skeleton width="100%" css={styles.button} />
        <Skeleton width="14rem" height="1.25rem" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
    gap: rhythm.group,
    alignItems: "start",
  },
  master: {
    minInlineSize: 0,
  },
  header: {
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
  title: {
    margin: 0,
  },
  button: {
    height: controlSize._8,
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  narrowOnly: {
    display: { default: "flex", [breakpoints.lg]: "none" },
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
  pane: {
    display: { default: "none", [breakpoints.lg]: "flex" },
    padding: space._5,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
});
