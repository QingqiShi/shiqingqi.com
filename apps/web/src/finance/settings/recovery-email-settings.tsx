"use client";

import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { withPendingKey } from "../shell/with-pending.ts";
import { useAuthErrorMessage } from "../sign-in/use-auth-error-message.ts";
import { useIsOwner } from "./use-is-owner.ts";
import {
  publishRecoveryEmail,
  useRecoveryEmail,
} from "./use-recovery-email.ts";

/** The signed-in user's Recovery email: add or change it, and send the confirmation link. */
export function RecoveryEmailSettings() {
  const locale = useLocale();
  const isOwner = useIsOwner();
  const recoveryEmail = useRecoveryEmail();
  const messageOf = useAuthErrorMessage();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"save" | "resend" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<FinanceApiError | null>(null);

  const verified = recoveryEmail?.verified ?? false;
  const email = recoveryEmail?.email ?? null;

  async function send(address: string, kind: "save" | "resend") {
    await withPendingKey(setBusy, kind, async () => {
      setError(null);
      setSentTo(null);
      try {
        const result = await financePasskeyClient.setRecoveryEmail(
          address,
          locale,
        );
        publishRecoveryEmail(result);
        setDraft("");
        if (!result.verified) setSentTo(result.email);
      } catch (caught) {
        setError(toFinanceApiError(caught));
      }
    });
  }

  return (
    <section css={stack.item}>
      <div css={stack.tight}>
        <Heading level={3} look="h4">
          {t({ en: "Your recovery email", zh: "你的恢复邮箱" })}
        </Heading>
        <Text look="bodySmall" tone="muted">
          {verified
            ? t({
                en: "If you lose every passkey, ask for a recovery link on the sign-in page. It goes to this address.",
                zh: "如果你丢失了全部通行密钥，可以在登录页申请恢复链接，链接会发到此邮箱。",
              })
            : isOwner
              ? t({
                  en: "Add an email to get back in if you lose every passkey. As the owner, nobody else can make a recovery link for you.",
                  zh: "添加邮箱，以便在丢失全部通行密钥后重新进入。你是所有者，没有其他人能为你生成恢复链接。",
                })
              : t({
                  en: "Add an email to get back in if you lose every passkey. The owner can also make a recovery link for you.",
                  zh: "添加邮箱，以便在丢失全部通行密钥后重新进入。所有者也可以为你生成恢复链接。",
                })}
        </Text>
      </div>
      {email === null ? null : (
        <div css={cluster.tight}>
          <Text look="bodySmall">{email}</Text>
          <Badge size="sm" intent="neutral">
            {verified
              ? t({ en: "Confirmed", zh: "已确认" })
              : t({ en: "Not confirmed", zh: "未确认" })}
          </Badge>
          {verified ? null : (
            <Button
              size="sm"
              look="ghost"
              loading={busy === "resend"}
              disabled={busy !== null}
              onClick={() => void send(email, "resend")}
            >
              {t({ en: "Send the link again", zh: "重新发送链接" })}
            </Button>
          )}
        </div>
      )}
      {sentTo === null ? null : (
        <Callout intent="info" role="status">
          {`${t({
            en: "Open the link we sent to ",
            zh: "请打开发送到 ",
          })}${sentTo}${t({
            en: " to confirm it. The link works for 1 hour.",
            zh: " 的链接完成确认。链接 1 小时内有效。",
          })}`}
        </Callout>
      )}
      {error === null ? null : (
        <Callout intent="danger" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <form
        css={stack.tight}
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft, "save");
        }}
      >
        <TextField
          label={
            email === null
              ? t({ en: "Recovery email", zh: "恢复邮箱" })
              : t({ en: "New recovery email", zh: "新的恢复邮箱" })
          }
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <div>
          <Button
            type="submit"
            size="sm"
            look="outline"
            loading={busy === "save"}
            disabled={busy !== null}
          >
            {t({ en: "Send confirmation link", zh: "发送确认链接" })}
          </Button>
        </div>
      </form>
    </section>
  );
}
