"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import {
  toBuddyApiError,
  type BuddyApiError,
} from "../http/buddy-api-error.ts";
import { passkeyClient } from "./passkey-client.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

/** Saves a new passkey on this device in place of the account's lost passkeys. */
export function RecoveryPanel({
  token,
  accountName,
}: {
  token: string;
  accountName: string;
}) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BuddyApiError | null>(null);

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        passkeyClient
          .recover(token)
          .then(({ name }) => {
            window.location.assign(getLocalePath(`/u/${name}`, locale));
          })
          .catch((caught: unknown) => {
            const apiError = toBuddyApiError(caught);
            if (apiError.code !== "cancelled") setError(apiError);
            setBusy(false);
          });
      }}
    >
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Welcome back", zh: "欢迎回来" })}
        </Heading>
        <Text tone="muted">@{accountName}</Text>
        <Text tone="muted">
          {t({
            en: "Save a new passkey on this device. The passkeys saved before stop working, and every other device signs out.",
            zh: "在本设备上保存新的通行密钥。之前保存的通行密钥将失效，其他设备都会退出登录。",
          })}
        </Text>
      </div>
      {error ? (
        <Callout intent="danger" role="alert">
          {messageOf(error)}
        </Callout>
      ) : null}
      <Button
        type="submit"
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={styles.wide}
      >
        {t({ en: "Save a new passkey", zh: "保存新的通行密钥" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
