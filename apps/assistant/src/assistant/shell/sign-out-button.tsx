"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { passkeyClient } from "@tuja/auth-ui/passkey-client";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { Button } from "@tuja/ui/components/button";
import { useState } from "react";
import { unsubscribeThisDevice } from "../push/unsubscribe-this-device.ts";

/** Signs out. It sits under the Settings menu. */
export function SignOutButton() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      look="ghost"
      icon={<SignOutIcon weight="bold" />}
      loading={busy}
      onClick={() => {
        setBusy(true);
        void unsubscribeThisDevice()
          .catch(() => undefined)
          .then(() => passkeyClient.signOut())
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
