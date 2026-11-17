"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { toApiError, type ApiError } from "../api-error.ts";
import { passkeyClient } from "../passkey-client.ts";
import { useAuthErrorMessage } from "../use-auth-error-message.ts";

/** Saves one more passkey for the signed-in user, e.g. on a new device. */
export function AddPasskeyButton() {
  const messageOf = useAuthErrorMessage({
    passkey_exists: t({
      en: "This device has a passkey for your account already.",
      zh: "此设备上已有你账号的通行密钥。",
    }),
    challenge_invalid: t({
      en: "That took too long. Try again.",
      zh: "用时过长，请重试。",
    }),
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  return (
    <div css={stack.item}>
      {saved ? (
        <Callout intent="success" role="status">
          {t({
            en: "Passkey saved. You can sign in with it now.",
            zh: "通行密钥已保存，现在可以用它登录。",
          })}
        </Callout>
      ) : null}
      {error === null ? null : (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <div>
        <Button
          look="outline"
          icon={<FingerprintIcon weight="bold" />}
          loading={busy}
          onClick={() => {
            setBusy(true);
            setSaved(false);
            setError(null);
            passkeyClient
              .addPasskey()
              .then(() => {
                setSaved(true);
              })
              .catch((caught: unknown) => {
                const apiError = toApiError(caught);
                if (apiError.code !== "cancelled") setError(apiError);
              })
              .finally(() => {
                setBusy(false);
              });
          }}
        >
          {t({ en: "Add a passkey", zh: "添加通行密钥" })}
        </Button>
      </div>
    </div>
  );
}
