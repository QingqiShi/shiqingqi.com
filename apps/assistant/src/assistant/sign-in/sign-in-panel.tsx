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

/** Passkey sign-in with a passkey the owner saved already. */
export function SignInPanel({ next }: { next: string }) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AssistantApiError | null>(null);

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Sign in", zh: "登录" })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "Use the passkey saved on this device or your phone.",
            zh: "使用保存在本设备或手机上的通行密钥。",
          })}
        </Text>
      </div>
      {error ? (
        <Callout intent="danger" role="alert">
          {messageOf(error)}
        </Callout>
      ) : null}
      <Button
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={styles.wide}
        onClick={() => {
          setBusy(true);
          setError(null);
          passkeyClient
            .signIn()
            .then(() => {
              window.location.assign(getLocalePath(next, locale));
            })
            .catch((caught: unknown) => {
              const apiError = toAssistantApiError(caught);
              if (apiError.code !== "cancelled") setError(apiError);
              setBusy(false);
            });
        }}
      >
        {t({ en: "Sign in with a passkey", zh: "使用通行密钥登录" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
