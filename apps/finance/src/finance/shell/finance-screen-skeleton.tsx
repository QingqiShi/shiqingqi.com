import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { NetWorthSkeleton } from "../accounts/net-worth-skeleton.tsx";
import { AnalyticsSkeleton } from "../analytics/analytics-skeleton.tsx";
import { ReportsSkeleton } from "../reports/reports-skeleton.tsx";
import { SettingsSkeleton } from "../settings/settings-skeleton.tsx";
import { TransactionsSkeleton } from "../transactions/transactions-skeleton.tsx";
import { FinanceAddButton } from "./finance-add-button.tsx";
import { FinancePageColumn } from "./finance-page-column.tsx";

/** What the Finance screen at `path` (locale-free) shows while the server renders it. */
export function FinanceScreenSkeleton({ path }: { path: string }) {
  switch (path) {
    case "/":
      return <NetWorthSkeleton />;
    case "/transactions":
      return <TransactionsSkeleton />;
    case "/analytics":
      return (
        <FinancePageColumn accessory={<FinanceAddButton />}>
          <AnalyticsSkeleton />
        </FinancePageColumn>
      );
    case "/reports":
      return (
        <FinancePageColumn accessory={<FinanceAddButton />}>
          <ReportsSkeleton />
        </FinancePageColumn>
      );
    case "/settings":
      return (
        <FinancePageColumn>
          <SettingsSkeleton />
        </FinancePageColumn>
      );
    default:
      return (
        <FinancePageColumn>
          <div css={stack.item} aria-busy>
            <Skeleton width="8rem" height="1.5rem" />
            <Skeleton width="14rem" height="2.5rem" />
            <Skeleton width="100%" height="12rem" />
          </div>
        </FinancePageColumn>
      );
  }
}
