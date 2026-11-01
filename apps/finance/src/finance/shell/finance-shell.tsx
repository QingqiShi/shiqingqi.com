import type { SupportedLocale } from "@tuja/i18n/types";
import type { ReactNode } from "react";
import { InstallSheet } from "../pwa/install-sheet.tsx";
import { DemoNotice } from "./demo-notice.tsx";
import { FinanceRailHeader } from "./finance-rail-header.tsx";
import { FinanceRailMember } from "./finance-rail-member.tsx";
import {
  FinanceScreenSlot,
  PendingScreenProvider,
} from "./finance-screen-slot.tsx";
import { FinanceTabView } from "./finance-tab-view.tsx";
import { FinanceToastProvider } from "./finance-toast-provider.tsx";
import { NewTransactionShortcut } from "./new-transaction-shortcut.tsx";
import { OfflineNavigationGuard } from "./offline-navigation-guard.tsx";
import { PrecacheFinanceShells } from "./precache-finance-shells.tsx";
import { PrewarmScreens } from "./prewarm-screens.tsx";
import { RejectionToasts } from "./rejection-toasts.tsx";
import { ReplicaGate } from "./replica-gate.tsx";

interface FinanceShellProps {
  locale: SupportedLocale;
  memberName: string;
  householdName: string;
  children: ReactNode;
}

/**
 * The Finance app frame. At `md` and wider, the rail holds the Add action,
 * the five destinations, the sync status and the signed-in Member. Below
 * `md`, the tab bar holds the destinations and marks a sync problem on
 * Settings, each screen floats the Add action, and the Settings menu shows
 * the signed-in Member and the full sync status. Also the toast and the `n`
 * key, which opens a new Transaction. Render it inside `FinanceProvider`.
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
        <FinanceTabView
          header={<FinanceRailHeader locale={locale} />}
          footer={
            <FinanceRailMember
              memberName={memberName}
              householdName={householdName}
            />
          }
        >
          <FinanceScreenSlot>
            <ReplicaGate>{children}</ReplicaGate>
          </FinanceScreenSlot>
        </FinanceTabView>
        <NewTransactionShortcut />
      </PendingScreenProvider>
      <DemoNotice />
      <RejectionToasts />
      <PrecacheFinanceShells />
      <PrewarmScreens />
      <OfflineNavigationGuard />
      <InstallSheet />
    </FinanceToastProvider>
  );
}
