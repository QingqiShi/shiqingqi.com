"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Divider } from "@tuja/ui/components/divider";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState, type ReactNode } from "react";
import { toApiError, type ApiError } from "../api-error.ts";
import { passkeyClient } from "../passkey-client.ts";
import { useAuthErrorMessage } from "../use-auth-error-message.ts";
import { RecoveryRequestForm } from "./recovery-request-form.tsx";
import { SignUpRequestForm } from "./sign-up-request-form.tsx";

interface SignInPanelProps {
  /** Where to go after signing in, without a locale. */
  next: string;
  /** A sentence about what a new user gets in this app, under the sign-up heading. */
  signUpNote?: string;
  /** Another way in that only this app has, under the sign-up form. */
  children?: ReactNode;
}

/**
 * Passkey sign-in, a recovery code by email for a user who lost every
 * passkey, and a sign-up code for a person who has no user yet.
 */
export function SignInPanel({ next, signUpNote, children }: SignInPanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

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
          <Callout intent="destructive" role="alert">
            {messageOf(error)}
          </Callout>
        ) : null}
        <Button
          look="primary"
          size="lg"
          icon={<FingerprintIcon weight="bold" />}
          loading={busy}
          css={fill.inline}
          onClick={() => {
            setBusy(true);
            setError(null);
            passkeyClient
              .signIn()
              .then(() => {
                window.location.assign(getLocalePath(next, locale));
              })
              .catch((caught: unknown) => {
                const apiError = toApiError(caught);
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
          <RecoveryRequestForm next={next} />
        </Disclosure>
      </div>
      <FlowBlock css={stack.section}>
        <Divider />
        <SignUpRequestForm next={next} note={signUpNote} />
        {children ? (
          <>
            <Divider />
            {children}
          </>
        ) : null}
      </FlowBlock>
    </div>
  );
}
