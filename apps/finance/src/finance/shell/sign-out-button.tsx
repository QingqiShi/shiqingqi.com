"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { useSignOut } from "./use-sign-out.ts";

/** Signs out and removes the Household's data from this device. */
export function SignOutButton() {
  const { busy, signOut } = useSignOut();

  return (
    <Button
      size="sm"
      look="ghost"
      icon={<SignOutIcon weight="bold" />}
      aria-label={t({ en: "Sign out", zh: "退出登录" })}
      loading={busy}
      onClick={signOut}
    />
  );
}
