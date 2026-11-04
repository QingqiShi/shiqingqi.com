"use client";

import { t } from "@tuja/i18n";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { NetWorthSkeleton } from "../accounts/net-worth-skeleton.tsx";
import { AnalyticsSkeleton } from "../analytics/analytics-skeleton.tsx";
import { ReportsSkeleton } from "../reports/reports-skeleton.tsx";
import { SettingsSkeleton } from "../settings/settings-skeleton.tsx";
import { TransactionsSkeleton } from "../transactions/transactions-skeleton.tsx";
import { FinanceScreenFrame } from "./finance-screen-frame.tsx";

/** What the Finance screen at `path` (locale-free) shows while the server renders it. */
export function FinanceScreenSkeleton({ path }: { path: string }) {
  switch (path) {
    case "/":
      return <NetWorthSkeleton />;
    case "/transactions":
      return <TransactionsSkeleton />;
    case "/analytics":
      return (
        <FinanceScreenFrame label={t({ en: "Analytics", zh: "分析" })}>
          <AnalyticsSkeleton />
        </FinanceScreenFrame>
      );
    case "/reports":
      return <ReportsSkeleton />;
    case "/settings":
      return <SettingsSkeleton />;
    default:
      return (
        <FinanceScreenFrame label={t({ en: "Loading", zh: "加载中" })}>
          <div css={stack.item} aria-busy>
            <Skeleton width="8rem" height="1.5rem" />
            <Skeleton width="14rem" height="2.5rem" />
            <Skeleton width="100%" height="12rem" />
          </div>
        </FinanceScreenFrame>
      );
  }
}
