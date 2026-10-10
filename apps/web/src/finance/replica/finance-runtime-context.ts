import { createContext } from "react";
import type { FinanceRuntime } from "./create-finance-runtime.ts";

interface FinanceRuntimeContextValue {
  runtime: FinanceRuntime;
  householdId: string;
  /** The signed-in Member. */
  memberId: string;
}

export const FinanceRuntimeContext =
  createContext<FinanceRuntimeContextValue | null>(null);
