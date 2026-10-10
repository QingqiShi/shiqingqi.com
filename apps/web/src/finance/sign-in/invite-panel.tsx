"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
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
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

interface InvitePanelProps {
  token: string;
  householdName: string;
  memberName: string;
  /** The invite lets a Member who lost their passkeys back in. */
  recovery: boolean;
}

/**
 * Accepts an invite: saves a passkey on this device and joins as the invited
 * Member. A recovery invite replaces the Member's lost passkeys instead.
 */
export function InvitePanel({
  token,
  householdName,
  memberName,
  recovery,
}: InvitePanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invitedFor = t({ en: "This invite is for", zh: "此邀请的受邀成员：" });

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {recovery
            ? `${t({ en: "Back into", zh: "重新进入" })} ${householdName}`
            : `${t({ en: "Join", zh: "加入" })} ${householdName}`}
        </Heading>
        <Text tone="muted">
          {`${invitedFor}${locale === "zh" ? "" : " "}${memberName}${locale === "zh" ? "。" : ". "}${
            recovery
              ? t({
                  en: "Save a new passkey on this device. The passkeys saved before stop working, and every other device signs out.",
                  zh: "在本设备上保存新的通行密钥。之前保存的通行密钥将失效，其他设备都会退出登录。",
                })
              : t({
                  en: "Save a passkey on this device to join.",
                  zh: "在本设备上保存通行密钥即可加入。",
                })
          }`}
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
            .acceptInvite(token)
            .then(() => {
              window.location.assign(getLocalePath("/finance", locale));
            })
            .catch((caught: unknown) => {
              const code =
                caught instanceof FinanceApiError
                  ? caught.code
                  : "request_failed";
              if (code !== "cancelled") setError(code);
              setBusy(false);
            });
        }}
      >
        {recovery
          ? t({ en: "Save a new passkey", zh: "保存新的通行密钥" })
          : t({ en: "Create a passkey", zh: "创建通行密钥" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
