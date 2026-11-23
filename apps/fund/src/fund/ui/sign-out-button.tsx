"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { postAuth } from "@tuja/auth-ui/passkey-client";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { useState } from "react";

/**
 * Signs out, then loads the sign-in page in full, so that no page the router
 * keeps still shows the fund. `iconOnly` fits the rail of the sidebar.
 */
export function SignOutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const label = t({ en: "Sign out", zh: "退出登录" });
  return (
    <Button
      size="sm"
      look="ghost"
      icon={<SignOutIcon weight="bold" />}
      aria-label={iconOnly ? label : undefined}
      loading={busy}
      onClick={() => {
        setBusy(true);
        void postAuth("/sign-out")
          .catch(() => undefined)
          .then(() => {
            window.location.assign(getLocalePath("/sign-in", locale));
          });
      }}
    >
      {iconOnly ? undefined : label}
    </Button>
  );
}
