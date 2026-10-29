import { useToast } from "@tuja/ui/components/toast-provider";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { financeSignInPath } from "../auth/finance-sign-in-path.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { clearHouseholdFromDevice } from "./clear-household-from-device.ts";

const CLEAR_FAILED_TOAST_MS = 60_000;

/**
 * Ends the session, removes every copy of the Household's data from this
 * device, and opens the sign-in page. When a copy stays, it says so and
 * offers to try again, and it stays on the page.
 */
export function useSignOut() {
  const locale = useLocale();
  const { runtime, householdId } = useFinanceRuntime();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const clearFailed = t({
    en: "You're signed out, but this device may still hold your household's data. Close other Finance tabs, then try again.",
    zh: "已退出登录，但这台设备上可能仍有家庭数据。请关闭其他家庭账本标签页后重试。",
  });
  const tryAgain = t({ en: "Try again", zh: "重试" });

  const clearThenLeave = async () => {
    setBusy(true);
    try {
      await clearHouseholdFromDevice(householdId, runtime);
      window.location.assign(financeSignInPath(locale));
    } catch {
      setBusy(false);
      showToast({
        message: clearFailed,
        action: {
          label: tryAgain,
          onAction: () => {
            void clearThenLeave();
          },
        },
        durationMs: CLEAR_FAILED_TOAST_MS,
      });
    }
  };

  const signOut = () => {
    setBusy(true);
    runtime.stop();
    void financePasskeyClient
      .signOut()
      .catch(() => undefined)
      .then(clearThenLeave);
  };

  return { busy, signOut };
}
