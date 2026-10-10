"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { Button } from "@tuja/ui/components/button";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { financeSignInPath } from "../auth/finance-sign-in-path.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { clearHouseholdFromDevice } from "./clear-household-from-device.ts";
import { useToast } from "./toast-provider.tsx";

const CLEAR_FAILED_TOAST_MS = 60_000;

/**
 * Ends the session and removes every copy of the Household's data from this
 * device. When a copy stays, it says so and offers to try again, and it
 * stays on the page.
 */
export function SignOutButton() {
  const locale = useLocale();
  const { runtime, householdId } = useFinanceRuntime();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const label = t({ en: "Sign out", zh: "退出登录" });
  const clearFailed = t({
    en: "You're signed out, but this device may still hold your household's data. Close other Finance tabs, then try again.",
    zh: "已退出登录，但这台设备上可能仍有家庭数据。请关闭其他家庭账本标签页后重试。",
  });
  const tryAgain = t({ en: "Try again", zh: "重试" });

  async function clearThenLeave() {
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
  }

  return (
    <Button
      size="sm"
      look="ghost"
      icon={<SignOutIcon weight="bold" />}
      aria-label={label}
      loading={busy}
      onClick={() => {
        setBusy(true);
        runtime.stop();
        void financePasskeyClient
          .signOut()
          .catch(() => undefined)
          .then(clearThenLeave);
      }}
    />
  );
}
