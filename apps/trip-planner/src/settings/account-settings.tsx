"use client";

import * as stylex from "@stylexjs/stylex";
import { postAuth } from "@tuja/auth-ui/passkey-client";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useRef, useState } from "react";
import { forgetAccountPages } from "./forget-account-pages.ts";
import { SettingsSection } from "./settings-section.tsx";

/** The signed-in account: its email, sign-out, and the removal of the account. */
export function AccountSettings({ email }: { email: string }) {
  const locale = useLocale();
  const headingId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<"sign-out" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const leave = async () => {
    await forgetAccountPages().catch(() => undefined);
    // A full load, so that no page that the router keeps shows the account.
    window.location.assign(getLocalePath("/settings", locale));
  };

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Account", zh: "账号" })}
      description={`${t({ en: "You are signed in as ", zh: "当前登录账号：" })}${email}${t({ en: ".", zh: "。" })}`}
    >
      <div css={cluster.tight}>
        <Button
          look="outline"
          loading={busy === "sign-out"}
          disabled={busy === "delete"}
          onClick={() => {
            setBusy("sign-out");
            void postAuth("/sign-out")
              .catch(() => undefined)
              .then(leave);
          }}
        >
          {t({ en: "Sign out", zh: "退出登录" })}
        </Button>
        <Button
          look="ghost"
          intent="destructive"
          disabled={busy !== null}
          onClick={() => {
            setDeleteFailed(false);
            setConfirming(true);
          }}
        >
          {t({ en: "Delete account", zh: "删除账号" })}
        </Button>
      </div>
      <Sheet
        isOpen={confirming}
        onClose={() => {
          if (busy === null) setConfirming(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        aria-labelledby={headingId}
        initialFocusRef={cancelRef}
      >
        <section aria-labelledby={headingId} css={[stack.group, styles.body]}>
          <Heading id={headingId} level={2} look="h3">
            {t({ en: "Delete your account?", zh: "要删除你的账号吗？" })}
          </Heading>
          <Text as="p">
            {t({
              en: "This deletes your account and its passkeys, and signs you out on every device. You cannot undo it.",
              zh: "这会删除你的账号及其通行密钥，并在所有设备上退出登录。此操作无法撤销。",
            })}
          </Text>
          {deleteFailed ? (
            <Callout intent="destructive" role="alert">
              {t({
                en: "The account was not deleted. Try again.",
                zh: "账号未能删除，请重试。",
              })}
            </Callout>
          ) : null}
          <div css={cluster.tight}>
            <Button
              look="destructive"
              loading={busy === "delete"}
              onClick={() => {
                setBusy("delete");
                setDeleteFailed(false);
                postAuth("/delete-account")
                  .then(leave)
                  .catch(() => {
                    setBusy(null);
                    setDeleteFailed(true);
                  });
              }}
            >
              {t({ en: "Delete account", zh: "删除账号" })}
            </Button>
            <Button
              ref={cancelRef}
              look="ghost"
              disabled={busy === "delete"}
              onClick={() => {
                setConfirming(false);
              }}
            >
              {t({ en: "Cancel", zh: "取消" })}
            </Button>
          </div>
        </section>
      </Sheet>
    </SettingsSection>
  );
}

const styles = stylex.create({
  body: {
    maxInlineSize: "32rem",
    marginInline: "auto",
  },
});
