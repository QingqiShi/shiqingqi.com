"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { ToastProvider } from "@tuja/ui/components/toast-provider";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { usePortalTarget } from "@tuja/ui/hooks/use-portal-target";
import type { ReactNode } from "react";

/** The toasts of the pages inside it. They show above the tab bar. */
export function AppToasts({ children }: { children: ReactNode }) {
  const portalTarget = usePortalTarget();
  return (
    <ToastProvider
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
      portalTarget={portalTarget}
      css={styles.toasts}
    >
      {children}
    </ToastProvider>
  );
}

const styles = stylex.create({
  toasts: {
    [toastTokens.clearance]: tabViewTokens.barClearance,
  },
});
