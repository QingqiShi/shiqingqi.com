import type { ReactNode } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { InstallSheet } from "../pwa/install-sheet.tsx";
import { FinanceRailHeader } from "./finance-rail-header.tsx";
import { FinanceRailMember } from "./finance-rail-member.tsx";
import {
  FinanceScreenSlot,
  PendingScreenProvider,
} from "./finance-screen-slot.tsx";
import { FinanceTabView } from "./finance-tab-view.tsx";
import { FinanceToastProvider } from "./finance-toast-provider.tsx";
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
 * The Finance app frame. At `md` and wider, the rail holds the five
 * destinations, the sync status and the signed-in Member. Below `md`, the tab
 * bar holds the destinations and marks a sync problem on Settings, and the
 * Settings menu shows the signed-in Member and the full sync status. Also the
 * toast. Render it inside `FinanceProvider`.
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
      </PendingScreenProvider>
      <RejectionToasts />
      <PrecacheFinanceShells />
      <PrewarmScreens />
      <OfflineNavigationGuard />
      <InstallSheet />
    </FinanceToastProvider>
  );
}
