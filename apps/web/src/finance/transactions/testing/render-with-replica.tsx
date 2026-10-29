import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { PortalTargetProvider } from "#src/site-shell/portal-target-provider.tsx";
import { render } from "#src/testing/test-utils.tsx";
import type { FinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../../replica/finance-runtime-context.ts";
import { FinanceToastProvider } from "../../shell/finance-toast-provider.tsx";
import { TEST_IDS } from "./create-test-replica.ts";

/**
 * Gives `children` the path and the query of `window.location`, and follows
 * each change of the history entry, as the router of Next does.
 */
function BrowserLocation({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));
  useEffect(() => {
    const sync = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };
    const push = window.history.pushState.bind(window.history);
    const replace = window.history.replaceState.bind(window.history);
    window.history.pushState = (...args) => {
      push(...args);
      sync();
    };
    window.history.replaceState = (...args) => {
      replace(...args);
      sync();
    };
    window.addEventListener("popstate", sync);
    return () => {
      Reflect.deleteProperty(window.history, "pushState");
      Reflect.deleteProperty(window.history, "replaceState");
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return (
    <PathnameContext value={location.pathname}>
      <SearchParamsContext value={new URLSearchParams(location.search)}>
        {children}
      </SearchParamsContext>
    </PathnameContext>
  );
}

/**
 * Renders `ui` inside the Finance providers, signed in as Alex unless
 * `memberId` says otherwise. It is at `pathname` with the query `search`
 * when they are given, or, with `followsHistory`, at `window.location` as
 * the history changes. `pushed` records the navigations of the router.
 */
export function renderWithReplica(
  runtime: FinanceRuntime,
  ui: ReactElement,
  {
    memberId = TEST_IDS.alex,
    pathname,
    search = "",
    followsHistory = false,
  }: {
    memberId?: string;
    pathname?: string;
    search?: string;
    followsHistory?: boolean;
  } = {},
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
      value={{
        runtime,
        householdId: TEST_IDS.household,
        memberId,
        readOnly: false,
      }}
    >
      <PortalTargetProvider>
        <FinanceToastProvider>{ui}</FinanceToastProvider>
      </PortalTargetProvider>
    </FinanceRuntimeContext>
  );
  const result = render(
    <AppRouterContext value={router}>
      {followsHistory ? (
        <BrowserLocation>{providers}</BrowserLocation>
      ) : pathname === undefined ? (
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
