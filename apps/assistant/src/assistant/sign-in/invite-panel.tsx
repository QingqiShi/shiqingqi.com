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
import { passkeyClient } from "../auth/passkey-client.ts";
import {
  toAssistantApiError,
  type AssistantApiError,
} from "../http/assistant-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

interface InvitePanelProps {
  token: string;
  displayName: string;
  /** The invite lets a user who lost their passkeys back in. */
  recovery: boolean;
}

/** Accepts an invite: saves a passkey on this device and signs in. A recovery invite replaces the user's lost passkeys. */
export function InvitePanel({
  token,
  displayName,
  recovery,
}: InvitePanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AssistantApiError | null>(null);

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        passkeyClient
          .acceptInvite(token)
          .then(() => {
            window.location.assign(getLocalePath("/", locale));
          })
          .catch((caught: unknown) => {
            const apiError = toAssistantApiError(caught);
            if (apiError.code !== "cancelled") setError(apiError);
            setBusy(false);
          });
      }}
    >
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {recovery
            ? t({ en: "Welcome back", zh: "欢迎回来" })
            : t({ en: "Welcome", zh: "欢迎" })}
        </Heading>
        <Text tone="muted">{displayName}</Text>
        <Text tone="muted">
          {recovery
            ? t({
                en: "Save a new passkey on this device. The passkeys saved before stop working, and every other device signs out.",
                zh: "在本设备上保存新的通行密钥。之前保存的通行密钥将失效，其他设备都会退出登录。",
              })
            : t({
                en: "Save a passkey on this device to start. You sign in with it from now on.",
                zh: "在本设备上保存通行密钥即可开始，以后用它登录。",
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
        {recovery
          ? t({ en: "Save a new passkey", zh: "保存新的通行密钥" })
          : t({ en: "Create a passkey", zh: "创建通行密钥" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
