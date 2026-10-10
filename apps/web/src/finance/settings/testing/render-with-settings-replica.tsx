import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactElement } from "react";
import { PortalTargetProvider } from "#src/site-shell/portal-target-provider.tsx";
import { render } from "#src/testing/test-utils.tsx";
import type { FinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../../replica/finance-runtime-context.ts";
import { ToastProvider } from "../../shell/toast-provider.tsx";
import { SETTINGS_IDS } from "./create-settings-replica.ts";

/** A router that records where the screen navigates to, in `pushed`. */
function createRecordingRouter() {
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
  return { router, pushed };
}

/** Renders `ui` inside the Finance providers, signed in as Alex (the owner) unless `memberId` says otherwise. */
export function renderWithSettingsReplica(
  runtime: FinanceRuntime,
  ui: ReactElement,
  { memberId = SETTINGS_IDS.alex }: { memberId?: string } = {},
) {
  const { router, pushed } = createRecordingRouter();
  const result = render(
    <AppRouterContext value={router}>
      <FinanceRuntimeContext
        value={{
          runtime,
          householdId: SETTINGS_IDS.household,
          memberId,
        }}
      >
        <PortalTargetProvider>
          <ToastProvider>{ui}</ToastProvider>
        </PortalTargetProvider>
      </FinanceRuntimeContext>
    </AppRouterContext>,
  );
  return { ...result, pushed };
}
