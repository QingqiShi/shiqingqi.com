"use client";

import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Divider } from "@tuja/ui/components/divider";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { RecoveryRequestForm } from "./recovery-request-form.tsx";
import { SignUpRequestForm } from "./sign-up-request-form.tsx";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

interface SignInPanelProps {
  /** Where to go after signing in, without a locale. */
  next: string;
}

/**
 * Passkey sign-in, a Recovery link by email for a user who lost every
 * passkey, a sign-up code for a person who has no User yet, and the
 * read-only demo.
 */
export function SignInPanel({ next }: SignInPanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);

  return (
    <div css={stack.section}>
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
            financePasskeyClient
              .signIn()
              .then(() => {
                window.location.assign(getLocalePath(next, locale));
              })
              .catch((caught: unknown) => {
                const apiError = toFinanceApiError(caught);
                if (apiError.code !== "cancelled") setError(apiError);
                setBusy(false);
              });
          }}
        >
          {t({ en: "Sign in with a passkey", zh: "使用通行密钥登录" })}
        </Button>
        <Disclosure
          summary={t({
            en: "Lost your passkey?",
            zh: "丢失了通行密钥？",
          })}
        >
          <RecoveryRequestForm />
        </Disclosure>
      </div>
      <Divider />
      <SignUpRequestForm />
      <Divider />
      <DemoEntry />
    </div>
  );
}

/** Opens the demo Household: made-up data that a visitor can change in this tab only. */
function DemoEntry() {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);

  return (
    <div css={stack.item}>
      <div css={stack.text}>
        <Heading level={2} look="h3">
          {t({ en: "Look around first", zh: "先随便看看" })}
        </Heading>
        <Text tone="muted" look="bodySmall">
          {t({
            en: "Open a made-up household. You can change anything, but nothing is saved.",
            zh: "打开一个虚构的家庭。你可以随意修改，但不会保存任何更改。",
          })}
        </Text>
      </div>
      {error ? (
        <Callout intent="danger" role="alert">
          {messageOf(error)}
        </Callout>
      ) : null}
      <Button
        look="outline"
        icon={<EyeIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={styles.wide}
        onClick={() => {
          setBusy(true);
          setError(null);
          financePasskeyClient
            .startDemo()
            .then(() => {
              window.location.assign(getLocalePath("/", locale));
            })
            .catch((caught: unknown) => {
              setError(toFinanceApiError(caught));
              setBusy(false);
            });
        }}
      >
        {t({ en: "Try the demo", zh: "试用演示" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
