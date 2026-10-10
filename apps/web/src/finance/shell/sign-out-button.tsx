"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { Button } from "@tuja/ui/components/button";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { FINANCE_PAGES_CACHE } from "#src/pwa/runtime-caching/finance-pages-cache.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { financeSignInPath } from "../auth/finance-sign-in-path.ts";
import { replicaDbName } from "../replica/open-replica-db.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";

/** Ends the session and removes this device's copy of the Household's data and its stored Finance pages. */
export function SignOutButton() {
  const locale = useLocale();
  const { runtime, householdId } = useFinanceRuntime();
  const [busy, setBusy] = useState(false);
  const label = t({ en: "Sign out", zh: "退出登录" });

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
          .then(async () => {
            indexedDB.deleteDatabase(replicaDbName(householdId));
            if ("caches" in window) {
              await caches.delete(FINANCE_PAGES_CACHE).catch(() => false);
            }
            window.location.assign(financeSignInPath(locale));
          });
      }}
    />
  );
}
