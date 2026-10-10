import * as stylex from "@stylexjs/stylex";
import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";
import type { ReactNode } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { FinanceAddButton } from "./finance-add-button.tsx";
import { FinanceNav } from "./finance-nav.tsx";
import { FinanceSidebarFooter } from "./finance-sidebar-footer.tsx";
import { FinanceSidebarHeader } from "./finance-sidebar-header.tsx";
import { FinanceTabBar } from "./finance-tab-bar.tsx";
import { OfflineNavigationGuard } from "./offline-navigation-guard.tsx";
import { PrecacheFinanceShells } from "./precache-finance-shells.tsx";
import { PrewarmScreens } from "./prewarm-screens.tsx";
import { RejectionToasts } from "./rejection-toasts.tsx";
import { ReplicaGate } from "./replica-gate.tsx";
import { tabBarTokens } from "./tab-bar.stylex.ts";
import { ToastProvider } from "./toast-provider.tsx";

interface FinanceShellProps {
  locale: SupportedLocale;
  memberName: string;
  householdName: string;
  children: ReactNode;
}

/**
 * The Finance app frame: the rail with the five destinations at `md` and
 * wider, the tab bar below `md` (the drawer then holds the signed-in Member
 * and the sync status); the floating Add action below `lg`; and the toast.
 * Render it inside `FinanceProvider`.
 */
export function FinanceShell({
  locale,
  memberName,
  householdName,
  children,
}: FinanceShellProps) {
  return (
    <ToastProvider>
      <SidebarLayout
        sidebar={<FinanceNav />}
        sidebarHeader={<FinanceSidebarHeader locale={locale} />}
        sidebarFooter={
          <FinanceSidebarFooter
            memberName={memberName}
            householdName={householdName}
          />
        }
        menuLabel={t({ en: "Finance menu", zh: "家庭账本菜单" })}
        closeLabel={t({ en: "Close menu", zh: "关闭菜单" })}
      >
        <div css={styles.content}>
          <ReplicaGate>{children}</ReplicaGate>
        </div>
      </SidebarLayout>
      <FinanceTabBar />
      <FinanceAddButton />
      <RejectionToasts />
      <PrecacheFinanceShells />
      <PrewarmScreens />
      <OfflineNavigationGuard />
    </ToastProvider>
  );
}

const styles = stylex.create({
  content: {
    paddingBlockEnd: tabBarTokens.clearance,
  },
});
