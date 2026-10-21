"use client";

import { Text } from "@tuja/ui/components/text";
import { grow } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useSearchParams } from "next/navigation";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { MasterDetailLayout } from "../shell/master-detail-layout.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUrlSelection } from "../shell/use-url-selection.ts";
import { AccountDetail } from "./account-detail.tsx";
import { NetWorthOverview } from "./net-worth-overview.tsx";
import { NetWorthSkeleton } from "./net-worth-skeleton.tsx";
import { NetWorthTrend } from "./net-worth-trend.tsx";
import { UpdateValuesForm } from "./update-values-form.tsx";

function SelectedAccount() {
  const selection = useUrlSelection("account");
  const isWide = useIsWideLayout();
  return selection.value === null ? null : (
    <AccountDetail
      accountId={selection.value}
      headingLevel={2}
      onDeleted={selection.clear}
      onClose={isWide ? selection.clear : undefined}
    />
  );
}

/**
 * `/finance`: the Net worth list beside the selected account at `lg` and
 * wider (`?account=`), and the "Update balances" form (`?mode=update`). With
 * no account picked, the trend fills the pane; with one picked, the trend
 * moves to the top of the list.
 */
export function NetWorthScreen() {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const mode = useSearchParams().get("mode");
  const isAccountOpen = useUrlSelection("account").value !== null;
  const isWide = useIsWideLayout();

  if (!bootstrapped) return <NetWorthSkeleton />;
  if (mode === "update") return <UpdateValuesForm />;
  return (
    <MasterDetailLayout
      param="account"
      masterKey={mode ?? undefined}
      master={<NetWorthOverview showTrend={!isWide || isAccountOpen} />}
      detail={<SelectedAccount />}
      empty={
        <div css={[stack.item, grow._1]}>
          <NetWorthTrend height="fill" />
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
