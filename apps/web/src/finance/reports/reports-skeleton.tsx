"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

const WEEKS = 5;

/** `/finance/reports` before it can show: the same title, list of weeks and newest Report, as blocks. */
export function ReportsSkeleton() {
  return (
    <div css={styles.root} aria-busy>
      <div css={stack.item}>
        <Heading level={1} look="h3" css={styles.title}>
          {t({ en: "Reports", zh: "周报" })}
        </Heading>
        <div css={styles.weeks}>
          {Array.from({ length: WEEKS }, (_, index) => (
            <Skeleton key={index} width="100%" height="2.625rem" />
          ))}
        </div>
      </div>
      <div css={[stack.item, styles.report]}>
        <Skeleton width="12rem" height="1.3rem" />
        <Skeleton width="60%" height="3rem" />
        <Skeleton width="100%" height="14rem" />
        <Skeleton width="100%" height="20rem" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "15rem minmax(0, 1fr)",
    },
    gap: rhythm.section,
    alignItems: "start",
  },
  title: {
    margin: 0,
  },
  weeks: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  report: {
    display: { default: "none", [breakpoints.lg]: "flex" },
    minInlineSize: 0,
    maxInlineSize: "84rem",
  },
});
