"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Anchor } from "#src/links/anchor.tsx";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

/**
 * Confirms a Recovery email when the user presses the button. Opening the
 * link changes nothing, so a mail scanner that opens it does not use it up.
 */
export function VerifyEmailPanel({ token }: { token: string }) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<
    "verified" | "ended" | "registered" | null
  >(null);
  const [error, setError] = useState<FinanceApiError | null>(null);

  const settingsLink = (
    <Anchor href={getLocalePath("/finance/settings/members", locale)}>
      {t({ en: "Go to Settings", zh: "前往设置" })}
    </Anchor>
  );

  const outcomes = {
    verified: {
      heading: t({ en: "Recovery email confirmed", zh: "恢复邮箱已确认" }),
      text: t({
        en: "If you lose every passkey, ask for a recovery link on the sign-in page.",
        zh: "如果你丢失了全部通行密钥，可以在登录页申请恢复链接。",
      }),
    },
    ended: {
      heading: t({ en: "This link has ended", zh: "此链接已失效" }),
      text: t({
        en: "It has expired or was used already, or the email changed after it was sent. Send a new link from Settings.",
        zh: "链接已过期或已被使用，或者发送后邮箱已更改。请在设置中重新发送链接。",
      }),
    },
    registered: {
      heading: t({ en: "This email is in use", zh: "此邮箱已被使用" }),
      text: t({
        en: "Another Finance sign-in already uses this email for recovery. Choose another email in Settings.",
        zh: "另一个家庭账本用户已将此邮箱设为恢复邮箱。请在设置中换一个邮箱。",
      }),
    },
  };

  if (outcome !== null) {
    return (
      <div css={stack.tight}>
        <Heading level={1} look="h2">
          {outcomes[outcome].heading}
        </Heading>
        <Text tone="muted">{outcomes[outcome].text}</Text>
        {settingsLink}
      </div>
    );
  }

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <Heading level={1} look="h2">
          {t({ en: "Confirm your recovery email", zh: "确认你的恢复邮箱" })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "Finance can then send you a recovery link if you lose every passkey.",
            zh: "确认后，如果你丢失了全部通行密钥，家庭账本可以把恢复链接发到此邮箱。",
          })}
        </Text>
      </div>
      {error === null ? null : (
        <Callout intent="danger" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <Button
        look="primary"
        size="lg"
        loading={busy}
        disabled={busy}
        css={styles.wide}
        onClick={() => {
          setBusy(true);
          setError(null);
          financePasskeyClient
            .verifyEmail(token, locale)
            .then((verified) => {
              setOutcome(verified ? "verified" : "ended");
            })
            .catch((caught: unknown) => {
              const apiError = toFinanceApiError(caught);
              if (apiError.code === "email_registered") {
                setOutcome("registered");
              } else {
                setError(apiError);
              }
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {t({ en: "Confirm email", zh: "确认邮箱" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
