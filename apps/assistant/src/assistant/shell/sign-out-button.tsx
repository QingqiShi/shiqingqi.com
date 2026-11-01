"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { useState } from "react";
import { passkeyClient } from "../auth/passkey-client.ts";
import { signInPath } from "../auth/sign-in-path.ts";

export function SignOutButton() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      look="ghost"
      icon={<SignOutIcon weight="bold" />}
      loading={busy}
      onClick={() => {
        setBusy(true);
        void passkeyClient
          .signOut()
          .catch(() => undefined)
          .then(() => {
            window.location.assign(signInPath(locale));
          });
      }}
    >
      {t({ en: "Sign out", zh: "退出登录" })}
    </Button>
  );
}
