"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

interface InvitePanelProps {
  token: string;
  householdName: string;
  memberName: string;
}

/**
 * Accepts an invite: takes the new user's Recovery email, saves a passkey on
 * this device and joins as the invited Member.
 */
export function InvitePanel({
  token,
  householdName,
  memberName,
}: InvitePanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);
  const [email, setEmail] = useState("");
  const invitedFor = t({ en: "This invite is for", zh: "此邀请的受邀成员：" });

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        financePasskeyClient
          .acceptInvite(token, { email, locale })
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
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {`${t({ en: "Join", zh: "加入" })} ${householdName}`}
        </Heading>
        <Text tone="muted">
          {`${invitedFor}${locale === "zh" ? "" : " "}${memberName}${locale === "zh" ? "。" : ". "}${t(
            {
              en: "Save a passkey on this device to join.",
              zh: "在本设备上保存通行密钥即可加入。",
            },
          )}`}
        </Text>
      </div>
      {error ? (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      ) : null}
      <TextField
        label={t({ en: "Recovery email", zh: "恢复邮箱" })}
        description={t({
          en: "We send a link to confirm it. If you lose your passkey, you can get back in through it.",
          zh: "我们会发送链接以确认此邮箱。如果你丢失了通行密钥，可以通过它重新进入。",
        })}
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
      />
      <Button
        type="submit"
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={fill.inline}
      >
        {t({ en: "Create a passkey", zh: "创建通行密钥" })}
      </Button>
    </form>
  );
}
