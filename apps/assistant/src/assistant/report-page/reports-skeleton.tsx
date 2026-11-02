"use client";

import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SkeletonList } from "../shell/skeleton-list.tsx";
import { ReportsIslands } from "./reports-islands.tsx";

/** The open report before it can show: its headline over a list. */
export function ReportBodySkeleton() {
  return (
    <div css={stack.group} aria-busy>
      <div css={stack.tight}>
        <Skeleton width="10rem" height="1em" />
        <Skeleton width="min(28rem, 100%)" height="2rem" />
      </div>
      <SkeletonList rows={3} width="70%" />
    </div>
  );
}

/** The morning reports before they can show, in the islands that they show in. */
export function ReportsSkeleton() {
  return (
    <ReportsIslands
      isOnList={false}
      reportKey="latest"
      list={
        <div css={stack.item} aria-busy>
          <Heading level={2} look="h3">
            {t({ en: "Past reports", zh: "往期晨报" })}
          </Heading>
          <SkeletonList rows={6} width="80%" />
        </div>
      }
    >
      <ReportBodySkeleton />
    </ReportsIslands>
  );
}
