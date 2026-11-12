import type { SupportedLocale } from "@tuja/i18n/types";
import type { ReactNode } from "react";
import { InstallSheet } from "../pwa/install-sheet.tsx";
import { DemoNotice } from "./demo-notice.tsx";
import { FinanceRailHeader } from "./finance-rail-header.tsx";
import { FinanceRailMember } from "./finance-rail-member.tsx";
import { FinanceTabView } from "./finance-tab-view.tsx";
import { FinanceToastProvider } from "./finance-toast-provider.tsx";
import { MemberMenuProvider } from "./member-menu-provider.tsx";
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
  /** The visitor collapsed the sidebar, from the cookie that the `TabView` keeps. */
  defaultCollapsed: boolean;
  children: ReactNode;
}

/**
 * The Finance app frame. From 34rem, the rail or the sidebar holds the Add action,
 * the five destinations, the sync status and the signed-in Member. Below
 * 34rem, the tab bar holds the destinations and marks a sync problem on
 * Settings, each screen floats the Add action, and the Settings menu shows
 * the signed-in Member and the full sync status. Also the toast and the `n`
 * key, which opens a new Transaction. Render it inside `FinanceProvider`.
 */
export function FinanceShell({
  locale,
  memberName,
  householdName,
  defaultCollapsed,
  children,
}: FinanceShellProps) {
  return (
    <FinanceToastProvider>
      <MemberMenuProvider>
        <FinanceTabView
          defaultCollapsed={defaultCollapsed}
          header={
            <FinanceRailHeader locale={locale} householdName={householdName} />
          }
          footer={
            <FinanceRailMember
              memberName={memberName}
              householdName={householdName}
            />
          }
        >
          <ReplicaGate>{children}</ReplicaGate>
          <NewTransactionShortcut />
          <DemoNotice />
        </FinanceTabView>
      </MemberMenuProvider>
      <RejectionToasts />
      <PrecacheFinanceShells />
      <PrewarmScreens />
      <OfflineNavigationGuard />
      <InstallSheet />
    </FinanceToastProvider>
  );
}
