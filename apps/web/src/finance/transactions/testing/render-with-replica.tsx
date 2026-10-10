import type { ReactElement } from "react";
import { PortalTargetProvider } from "#src/site-shell/portal-target-provider.tsx";
import { render } from "#src/testing/test-utils.tsx";
import type { FinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../../replica/finance-runtime-context.ts";
import { ToastProvider } from "../../shell/toast-provider.tsx";
import { TEST_IDS } from "./create-test-replica.ts";

/** Renders `ui` inside the Finance providers, signed in as Alex. */
export function renderWithReplica(runtime: FinanceRuntime, ui: ReactElement) {
  return render(
    <FinanceRuntimeContext
      value={{
        runtime,
        householdId: TEST_IDS.household,
        memberId: TEST_IDS.alex,
      }}
    >
      <PortalTargetProvider>
        <ToastProvider>{ui}</ToastProvider>
      </PortalTargetProvider>
    </FinanceRuntimeContext>,
  );
}
