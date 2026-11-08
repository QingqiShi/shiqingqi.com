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

interface SignUpPanelProps {
  token: string;
  /** The confirmed address, which recovers the account if its passkeys are lost. */
  email: string;
}

/** Makes the account for the confirmed address and saves its passkey on this device. */
export function SignUpPanel({ token, email }: SignUpPanelProps) {
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
          .signUp(token)
          .then((signedIn) => {
            window.location.assign(
              getLocalePath(`/u/${signedIn.name}`, locale),
            );
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
          {t({ en: "Sign up for Buddy", zh: "注册搭子" })}
        </Heading>
        <Text tone="muted">
          {`${t({ en: "Email confirmed: ", zh: "邮箱已确认：" })}${email}${t({
            en: ". Create a passkey on this device to finish. You will use it to sign in.",
            zh: "。在本设备上创建通行密钥即可完成，之后用它登录。",
          })}`}
        </Text>
      </div>
      {error === null ? null : (
        <Callout intent="danger" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <Button
        type="submit"
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={styles.wide}
      >
        {t({ en: "Create a passkey", zh: "创建通行密钥" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
