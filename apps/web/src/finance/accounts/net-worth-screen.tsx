"use client";

import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useSearchParams } from "next/navigation";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { MasterDetailLayout } from "../shell/master-detail-layout.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUrlSelection } from "../shell/use-url-selection.ts";
import { AccountDetail } from "./account-detail.tsx";
import { NetWorthOverview } from "./net-worth-overview.tsx";
import { NetWorthTrend } from "./net-worth-trend.tsx";
import { UpdateValuesForm } from "./update-values-form.tsx";

function SelectedAccount() {
  const selection = useUrlSelection("account");
  return selection.value === null ? null : (
    <AccountDetail
      accountId={selection.value}
      headingLevel={2}
      onDeleted={selection.clear}
    />
  );
}

/**
 * `/finance`: the Net worth list beside the selected account at `lg` and
 * wider (`?account=`), and the "Update balances" form (`?mode=update`). With
 * no account picked, the pane holds the trend chart.
 */
export function NetWorthScreen() {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const mode = useSearchParams().get("mode");
  const isWide = useIsWideLayout();

  if (!bootstrapped) {
    return (
      <div css={stack.item} aria-busy>
        <Skeleton width="8rem" height="1.5rem" />
        <Skeleton width="14rem" height="2.5rem" />
        <Skeleton width="100%" height="12rem" />
      </div>
    );
  }
  if (mode === "update") return <UpdateValuesForm />;
  return (
    <MasterDetailLayout
      param="account"
      master={<NetWorthOverview showTrend={!isWide} />}
      detail={<SelectedAccount />}
      empty={
        <div css={stack.item}>
          <NetWorthTrend height={320} />
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Pick an account to see its history.",
              zh: "选择一个账户查看其历史。",
            })}
          </Text>
        </div>
      }
      detailLabel={t({ en: "Account", zh: "账户" })}
    />
  );
}
