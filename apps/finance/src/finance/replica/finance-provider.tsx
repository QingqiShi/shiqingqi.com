"use client";

import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { useEffect, useState, type ReactNode } from "react";
import { createFinanceRuntime } from "./create-finance-runtime.ts";
import { FinanceRuntimeContext } from "./finance-runtime-context.ts";

interface FinanceProviderProps {
  householdId: string;
  memberId: string;
  readOnly: boolean;
  children: ReactNode;
}

/**
 * Opens the Household's Replica in this tab and keeps it in sync. Screens
 * below read it with `useReplica` and write with `useReplicaStore().applyLocal`.
 */
export function FinanceProvider({
  householdId,
  memberId,
  readOnly,
  children,
}: FinanceProviderProps) {
  const locale = useLocale();
  const [runtime] = useState(() =>
    createFinanceRuntime({
      householdId,
      readOnly,
      onUnauthorised: () => {
        const here = `${normalizePath(window.location.pathname)}${window.location.search}`;
        window.location.assign(signInPath(locale, here));
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
    <FinanceRuntimeContext value={{ runtime, householdId, memberId, readOnly }}>
      {children}
    </FinanceRuntimeContext>
  );
}
