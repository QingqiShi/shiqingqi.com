import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactElement } from "react";
import { PortalTargetProvider } from "#src/site-shell/portal-target-provider.tsx";
import { render } from "#src/testing/test-utils.tsx";
import type { FinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../../replica/finance-runtime-context.ts";
import { ToastProvider } from "../../shell/toast-provider.tsx";
import { TEST_IDS } from "../../transactions/testing/create-test-replica.ts";

/** Renders `ui` at `/finance` inside the Finance providers, signed in as Alex; `pushed` records navigations. */
export function renderWithAccountsReplica(
  runtime: FinanceRuntime,
  ui: ReactElement,
) {
  const pushed: string[] = [];
  const router: AppRouterInstance = {
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    push: (href) => {
      pushed.push(href);
    },
    replace: (href) => {
      pushed.push(href);
    },
    prefetch: () => undefined,
    bfcacheId: "test",
  };
  const result = render(
    <AppRouterContext value={router}>
      <PathnameContext value="/finance">
        <SearchParamsContext value={new URLSearchParams()}>
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
          </FinanceRuntimeContext>
        </SearchParamsContext>
      </PathnameContext>
    </AppRouterContext>,
  );
  return { ...result, pushed };
}
