"use client";

import { useEffect, useState, type ReactNode } from "react";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { financeSignInPath } from "../auth/finance-sign-in-path.ts";
import { createFinanceRuntime } from "./create-finance-runtime.ts";
import { FinanceRuntimeContext } from "./finance-runtime-context.ts";

interface FinanceProviderProps {
  householdId: string;
  memberId: string;
  children: ReactNode;
}

/**
 * Opens the Household's Replica in this tab and keeps it in sync. Screens
 * below read it with `useReplica` and write with `useReplicaStore().applyLocal`.
 */
export function FinanceProvider({
  householdId,
  memberId,
  children,
}: FinanceProviderProps) {
  const locale = useLocale();
  const [runtime] = useState(() =>
    createFinanceRuntime({
      householdId,
      onUnauthorised: () => {
        const here = `${normalizePath(window.location.pathname)}${window.location.search}`;
        window.location.assign(financeSignInPath(locale, here));
      },
    }),
  );

  useEffect(() => {
    void runtime.start();
    return () => {
      runtime.stop();
    };
  }, [runtime]);

  return (
    <FinanceRuntimeContext value={{ runtime, householdId, memberId }}>
      {children}
    </FinanceRuntimeContext>
  );
}
