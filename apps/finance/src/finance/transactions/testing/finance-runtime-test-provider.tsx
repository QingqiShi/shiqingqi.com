import type { ReactNode } from "react";
import type { FinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../../replica/finance-runtime-context.ts";
import { TEST_IDS } from "./create-test-replica.ts";

/**
 * Gives `children` the Finance runtime of the test Household, signed in as
 * Alex unless `memberId` says otherwise.
 */
export function FinanceRuntimeTestProvider({
  runtime,
  memberId = TEST_IDS.alex,
  children,
}: {
  runtime: FinanceRuntime;
  memberId?: string;
  children: ReactNode;
}) {
  return (
    <FinanceRuntimeContext
      value={{
        runtime,
        householdId: TEST_IDS.household,
        memberId,
        readOnly: false,
      }}
    >
      {children}
    </FinanceRuntimeContext>
  );
}
