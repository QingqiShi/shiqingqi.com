"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useRef, useState, type ReactNode } from "react";
import { toApiError, type ApiError } from "../api-error.ts";
import { passkeyClient } from "../passkey-client.ts";
import { useAuthErrorMessage } from "../use-auth-error-message.ts";

interface DeleteAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Runs after the account is gone and the session ended. It must leave the page. */
  onDeleted: () => Promise<void>;
  /** What the app deletes and keeps besides the account, such as the user's own data. */
  children?: ReactNode;
}

/**
 * Says what a deletion of the signed-in user's account takes, and deletes it
 * when the user confirms with a passkey of the account.
 */
export function DeleteAccountSheet({
  isOpen,
  onClose,
  onDeleted,
  children,
}: DeleteAccountSheetProps) {
  const headingId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const messageOf = useAuthErrorMessage({
    passkey_unknown: t({
      en: "That passkey is for another account. Nothing was deleted.",
      zh: "该通行密钥属于其他账号，没有删除任何内容。",
    }),
    challenge_invalid: t({
      en: "The check took too long. Try again.",
      zh: "验证用时过长，请重试。",
    }),
    unauthorized: t({
      en: "You are signed out. Sign in again to delete your account.",
      zh: "你已退出登录。请重新登录后再删除账号。",
    }),
  });

  return (
    <Sheet
      isOpen={isOpen}
      onClose={() => {
        if (busy) return;
        setError(null);
        onClose();
      }}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      aria-labelledby={headingId}
      initialFocusRef={cancelRef}
    >
      <section aria-labelledby={headingId} css={[stack.group, styles.body]}>
        <div css={stack.item}>
          <Heading id={headingId} level={2} look="h3">
            {t({ en: "Delete your account?", zh: "要删除你的账号吗？" })}
          </Heading>
          <Text as="p">
            {t({
              en: "Your account, its email address and its passkeys are deleted, and you are signed out on every device. You cannot undo this.",
              zh: "你的账号、账号邮箱和通行密钥都会被删除，你也会在所有设备上退出登录。此操作无法撤销。",
            })}
          </Text>
        </div>
        {children}
        <div css={stack.item}>
          {error ? (
            <Callout intent="destructive" role="alert">
              {messageOf(error)}
            </Callout>
          ) : null}
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "To confirm, use a passkey of this account.",
              zh: "请使用此账号的通行密钥确认。",
            })}
          </Text>
          <div css={cluster.tight}>
            <Button
              look="destructive"
              icon={<FingerprintIcon weight="bold" />}
              loading={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                passkeyClient
                  .deleteAccount()
                  .then(onDeleted)
                  .catch((caught: unknown) => {
                    const apiError = toApiError(caught);
                    if (apiError.code !== "cancelled") setError(apiError);
                    setBusy(false);
                  });
              }}
            >
              {t({ en: "Delete account", zh: "删除账号" })}
            </Button>
            <Button
              ref={cancelRef}
              look="ghost"
              disabled={busy}
              onClick={() => {
                setError(null);
                onClose();
              }}
            >
              {t({ en: "Cancel", zh: "取消" })}
            </Button>
          </div>
        </div>
      </section>
    </Sheet>
  );
}

const styles = stylex.create({
  body: {
    maxInlineSize: "32rem",
    marginInline: "auto",
  },
});
