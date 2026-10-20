import * as stylex from "@stylexjs/stylex";
import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";
import type { ReactNode } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { FinanceAddButton } from "./finance-add-button.tsx";
import { FinanceNav } from "./finance-nav.tsx";
import {
  FinanceScreenSlot,
  PendingScreenProvider,
} from "./finance-screen-slot.tsx";
import { FinanceSidebarHeader } from "./finance-sidebar-header.tsx";
import { FinanceTabBar } from "./finance-tab-bar.tsx";
import { FinanceToastProvider } from "./finance-toast-provider.tsx";
import { floatingActionTokens } from "./floating-action.stylex.ts";
import { OfflineNavigationGuard } from "./offline-navigation-guard.tsx";
import { PrecacheFinanceShells } from "./precache-finance-shells.tsx";
import { PrewarmScreens } from "./prewarm-screens.tsx";
import { RejectionToasts } from "./rejection-toasts.tsx";
import { ReplicaGate } from "./replica-gate.tsx";
import { SignedInMember } from "./signed-in-member.tsx";
import { tabBarTokens } from "./tab-bar.stylex.ts";

interface FinanceShellProps {
  locale: SupportedLocale;
  memberName: string;
  householdName: string;
  children: ReactNode;
}

/**
 * The Finance app frame. At `md` and wider, the rail holds the five
 * destinations and the signed-in Member. Below `md`, the tab bar holds the
 * destinations and marks a sync problem on Settings, and the Settings menu
 * shows the signed-in Member and the full sync status. Also the floating Add action below `lg`, and the toast.
 * Render it inside `FinanceProvider`.
 */
export function FinanceShell({
  locale,
  memberName,
  householdName,
  children,
}: FinanceShellProps) {
  return (
    <FinanceToastProvider>
      <PendingScreenProvider>
        <SidebarLayout
          sidebar={<FinanceNav />}
          sidebarHeader={<FinanceSidebarHeader locale={locale} />}
          sidebarFooter={
            <SignedInMember
              memberName={memberName}
              householdName={householdName}
            />
          }
          mobileSidebar="hidden"
        >
          <div css={styles.content}>
            <FinanceScreenSlot>
              <ReplicaGate>{children}</ReplicaGate>
            </FinanceScreenSlot>
          </div>
        </SidebarLayout>
        <FinanceTabBar />
      </PendingScreenProvider>
      <FinanceAddButton />
      <RejectionToasts />
      <PrecacheFinanceShells />
      <PrewarmScreens />
      <OfflineNavigationGuard />
    </FinanceToastProvider>
  );
}

const styles = stylex.create({
  content: {
    paddingBlockEnd: `max(${tabBarTokens.clearance}, ${floatingActionTokens.clearance})`,
  },
});
