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
import { FinanceToastProvider } from "../../shell/finance-toast-provider.tsx";
import { TEST_IDS } from "./create-test-replica.ts";

/**
 * Renders `ui` inside the Finance providers, signed in as Alex unless
 * `memberId` says otherwise, and at `pathname` with the query `search` when
 * it is given; `pushed` records navigations.
 */
export function renderWithReplica(
  runtime: FinanceRuntime,
  ui: ReactElement,
  {
    memberId = TEST_IDS.alex,
    pathname,
    search = "",
  }: { memberId?: string; pathname?: string; search?: string } = {},
) {
  const pushed: string[] = [];
  const record = (href: string) => {
    pushed.push(href);
  };
  const router: AppRouterInstance = {
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    push: record,
    replace: record,
    prefetch: () => undefined,
    bfcacheId: "test",
  };
  const providers = (
    <FinanceRuntimeContext
      value={{ runtime, householdId: TEST_IDS.household, memberId }}
    >
      <PortalTargetProvider>
        <FinanceToastProvider>{ui}</FinanceToastProvider>
      </PortalTargetProvider>
    </FinanceRuntimeContext>
  );
  const result = render(
    <AppRouterContext value={router}>
      {pathname === undefined ? (
        providers
      ) : (
        <PathnameContext value={pathname}>
          <SearchParamsContext value={new URLSearchParams(search)}>
            {providers}
          </SearchParamsContext>
        </PathnameContext>
      )}
    </AppRouterContext>,
  );
  return { ...result, pushed };
}
