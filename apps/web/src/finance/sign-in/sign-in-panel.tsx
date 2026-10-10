"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Divider } from "@tuja/ui/components/divider";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

export type SignInSetup =
  | { mode: "create" }
  | { mode: "claim"; householdName: string; memberName: string }
  | { mode: "recover" }
  | { mode: "closed" };

interface SignInPanelProps {
  /** Where to go after signing in, without a locale. */
  next: string;
  setup: SignInSetup;
}

type Busy = "sign-in" | "set-up" | null;

function errorCode(error: unknown) {
  return error instanceof FinanceApiError ? error.code : "request_failed";
}

/**
 * Passkey sign-in, the one-time setup while the Household has no owner, and
 * owner recovery with the setup secret once it has one.
 */
export function SignInPanel({ next, setup }: SignInPanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [memberName, setMemberName] = useState("");

  const finish = () => {
    window.location.assign(getLocalePath(next, locale));
  };

  const run = async (
    kind: Exclude<Busy, null>,
    action: () => Promise<unknown>,
  ) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
      finish();
    } catch (caught) {
      const code = errorCode(caught);
      if (code !== "cancelled") setError(code);
      setBusy(null);
    }
  };

  const signInLabel = t({
    en: "Sign in with a passkey",
    zh: "使用通行密钥登录",
  });

  const isFirstRun = setup.mode === "create" || setup.mode === "claim";
  const joinAs = t({ en: "Join as", zh: "加入身份：" });
  const joinLine =
    setup.mode === "claim"
      ? `${joinAs}${locale === "zh" ? "" : " "}${setup.memberName} · ${setup.householdName}`
      : "";

  const errorCallout = error ? (
    <Callout intent="danger" role="alert">
      {messageOf(error)}
    </Callout>
  ) : null;

  const signInButton = (
    <Button
      look={isFirstRun ? "outline" : "primary"}
      size="lg"
      icon={<FingerprintIcon weight="bold" />}
      loading={busy === "sign-in"}
      disabled={busy !== null}
      css={styles.wide}
      onClick={() => {
        void run("sign-in", () => financePasskeyClient.signIn());
      }}
    >
      {signInLabel}
    </Button>
  );

  const setupForm =
    setup.mode === "closed" ? null : (
      <form
        css={stack.item}
        onSubmit={(event) => {
          event.preventDefault();
          void run("set-up", () =>
            financePasskeyClient.setUp({
              setupSecret,
              householdName:
                setup.mode === "create" ? householdName : undefined,
              memberName: setup.mode === "create" ? memberName : undefined,
            }),
          );
        }}
      >
        <Text tone="muted" look="bodySmall">
          {setup.mode === "create"
            ? t({
                en: "Create the household and save a passkey on this device. You need the setup secret.",
                zh: "创建家庭并在本设备上保存通行密钥。需要设置口令。",
              })
            : setup.mode === "claim"
              ? joinLine
              : t({
                  en: "With the setup secret, save a new passkey on this device. The owner's old passkeys stop working and every other device signs out.",
                  zh: "输入设置口令，在本设备上保存新的通行密钥。所有者的旧通行密钥将失效，其他设备都会退出登录。",
                })}
        </Text>
        <TextField
          label={t({ en: "Setup secret", zh: "设置口令" })}
          type="password"
          autoComplete="off"
          required
          value={setupSecret}
          onChange={(event) => {
            setSetupSecret(event.target.value);
          }}
        />
        {setup.mode === "create" ? (
          <>
            <TextField
              label={t({ en: "Household name", zh: "家庭名称" })}
              autoComplete="off"
              required
              maxLength={200}
              value={householdName}
              onChange={(event) => {
                setHouseholdName(event.target.value);
              }}
            />
            <TextField
              label={t({ en: "Your name", zh: "你的名字" })}
              autoComplete="given-name"
              required
              maxLength={200}
              value={memberName}
              onChange={(event) => {
                setMemberName(event.target.value);
              }}
            />
          </>
        ) : null}
        <Button
          type="submit"
          look={isFirstRun ? "primary" : "outline"}
          size={isFirstRun ? "lg" : undefined}
          icon={isFirstRun ? <FingerprintIcon weight="bold" /> : undefined}
          loading={busy === "set-up"}
          disabled={busy !== null}
          css={styles.wide}
        >
          {setup.mode === "create"
            ? t({ en: "Create household", zh: "创建家庭" })
            : setup.mode === "claim"
              ? t({ en: "Create a passkey", zh: "创建通行密钥" })
              : t({
                  en: "Replace the owner's passkeys",
                  zh: "替换所有者的通行密钥",
                })}
        </Button>
      </form>
    );

  if (isFirstRun) {
    return (
      <div css={stack.section}>
        <div css={stack.item}>
          <Heading level={1} look="h1">
            {setup.mode === "create"
              ? t({ en: "Set up Finance", zh: "设置家庭账本" })
              : t({ en: "Claim your place", zh: "认领你的成员身份" })}
          </Heading>
          {errorCallout}
          {setupForm}
        </div>
        <Divider />
        <div css={stack.item}>
          <Text tone="muted" look="bodySmall">
            {t({
              en: "Saved a passkey already?",
              zh: "已经保存过通行密钥？",
            })}
          </Text>
          {signInButton}
        </div>
      </div>
    );
  }

  return (
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
      {errorCallout}
      {signInButton}
      {setup.mode === "recover" ? (
        <Disclosure
          summary={t({
            en: "Lost your passkey?",
            zh: "丢失了通行密钥？",
          })}
        >
          {setupForm}
        </Disclosure>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
