"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toAssistantApiError } from "../http/assistant-api-error.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

/** Connects a mailbox with an app-specific password. The server tries the login before it keeps it. */
export function PasswordConnectForm({
  provider,
}: {
  provider: "icloud" | "gmail";
}) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy =
    provider === "icloud"
      ? {
          refused: t({
            en: "iCloud refused this address and password. Check that you used an app-specific password, not your Apple Account password.",
            zh: "iCloud 拒绝了这个地址和密码。请确认使用的是 App 专用密码，而不是 Apple 账户密码。",
          }),
          address: t({ en: "iCloud email address", zh: "iCloud 邮箱地址" }),
          passwordHelp: t({
            en: "Make one at account.apple.com, under Sign-In and Security. It looks like abcd-efgh-ijkl-mnop.",
            zh: "在 account.apple.com 的“登录与安全”中生成，格式类似 abcd-efgh-ijkl-mnop。",
          }),
          submit: t({ en: "Connect iCloud", zh: "连接 iCloud" }),
        }
      : {
          refused: t({
            en: "Gmail refused this address and password. Use an app password, not your Google password.",
            zh: "Gmail 拒绝了这个地址和密码。请使用应用专用密码，而不是 Google 密码。",
          }),
          address: t({ en: "Gmail address", zh: "Gmail 地址" }),
          passwordHelp: t({
            en: "Make one at myaccount.google.com/apppasswords. It needs 2-Step Verification.",
            zh: "在 myaccount.google.com/apppasswords 生成，需要先开启两步验证。",
          }),
          submit: t({
            en: "Connect with app password",
            zh: "用应用专用密码连接",
          }),
        };
  const messages = {
    "login-refused": copy.refused,
    "mail-server-unreachable": t({
      en: "Could not reach the mail server. Try again in a minute.",
      zh: "暂时连不上邮件服务器，请稍后再试。",
    }),
    fallback: t({
      en: "The mailbox could not be connected. Try again.",
      zh: "邮箱没有连接成功，请重试。",
    }),
  };

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        assistantFetch(`/api/accounts/${provider}`, {
          method: "POST",
          body: JSON.stringify({ address, appPassword: password }),
        })
          .then(() => {
            setAddress("");
            setPassword("");
            router.refresh();
          })
          .catch((caught: unknown) => {
            const { code } = toAssistantApiError(caught);
            setError(
              code === "login-refused" || code === "mail-server-unreachable"
                ? messages[code]
                : messages.fallback,
            );
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      {error ? (
        <Callout intent="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      <TextField
        label={copy.address}
        type="email"
        autoComplete="username"
        required
        value={address}
        onChange={(event) => {
          setAddress(event.target.value);
        }}
      />
      <TextField
        label={t({ en: "App-specific password", zh: "App 专用密码" })}
        description={copy.passwordHelp}
        type="password"
        autoComplete="off"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
      />
      <div>
        <Button type="submit" look="primary" loading={busy} disabled={busy}>
          {copy.submit}
        </Button>
      </div>
    </form>
  );
}
