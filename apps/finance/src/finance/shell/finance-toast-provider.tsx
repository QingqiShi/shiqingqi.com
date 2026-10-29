"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { ToastProvider } from "@tuja/ui/components/toast-provider";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { usePortalTarget } from "@tuja/ui/hooks/use-portal-target";
import type { ReactNode } from "react";
import { floatingActionTokens } from "./floating-action.stylex.ts";

/**
 * The Finance toasts: `ToastProvider` in the site portal, above the tab bar
 * and the floating Add action.
 */
export function FinanceToastProvider({ children }: { children: ReactNode }) {
  const portalTarget = usePortalTarget();
  return (
    <ToastProvider
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
      portalTarget={portalTarget}
      css={styles.clearance}
    >
      {children}
    </ToastProvider>
  );
}

const styles = stylex.create({
  clearance: {
    [toastTokens.clearance]: {
      default: `calc(${floatingActionTokens.insetBlockEnd} + ${floatingActionTokens.blockSize})`,
      // A null value keeps the default above at `lg`. "unset" gives the
      // design-system value.
      [breakpoints.lg]: "unset",
    },
  },
});
