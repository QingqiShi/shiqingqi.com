import { use } from "react";
import { FinanceRuntimeContext } from "./finance-runtime-context.ts";

/** The Replica runtime and the signed-in Member; only inside `FinanceProvider`. */
export function useFinanceRuntime() {
  const value = use(FinanceRuntimeContext);
  if (!value) {
    throw new Error("useFinanceRuntime must be used within a FinanceProvider");
  }
  return value;
}
