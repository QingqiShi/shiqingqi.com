"use client";

import { passkeyClient } from "@tuja/auth-ui/passkey-client";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { useState } from "react";

export function SignOutButton() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      look="ghost"
      size="sm"
      loading={busy}
      onClick={() => {
        setBusy(true);
        passkeyClient
          .signOut()
          .catch(() => {})
          .finally(() => {
            window.location.assign(getLocalePath("/sign-in", locale));
          });
      }}
    >
      {t({ en: "Sign out", zh: "退出登录" })}
    </Button>
  );
}
