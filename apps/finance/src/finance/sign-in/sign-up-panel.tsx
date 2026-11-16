"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

interface SignUpPanelProps {
  token: string;
  /** The confirmed address that becomes the new User's Recovery email. */
  email: string;
}

/** Creates a User and saves a passkey on this device. The first-run screen comes next. */
export function SignUpPanel({ token, email }: SignUpPanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Sign up for Finance", zh: "注册家庭账本" })}
        </Heading>
        <Text tone="muted">
          {`${t({ en: "Email confirmed: ", zh: "邮箱已确认：" })}${email}${t({
            en: ". Save a passkey on this device to finish.",
            zh: "。在本设备上保存通行密钥即可完成注册。",
          })}`}
        </Text>
      </div>
      {error === null ? null : (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <Button
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={fill.inline}
        onClick={() => {
          setBusy(true);
          setError(null);
          financePasskeyClient
            .signUp(token)
            .then(() => {
              window.location.assign(getLocalePath("/", locale));
            })
            .catch((caught: unknown) => {
              const apiError = toFinanceApiError(caught);
              if (apiError.code !== "cancelled") setError(apiError);
              setBusy(false);
            });
        }}
      >
        {t({ en: "Save a passkey", zh: "保存通行密钥" })}
      </Button>
    </div>
  );
}
