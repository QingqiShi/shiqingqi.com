"use client";

import { toApiError, type ApiError } from "@tuja/auth-ui/api-error";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { currencyOptions } from "../accounts/currency-options.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

const NAME_MAX_LENGTH = 100;

/** The first-run screen: makes a Household named after the signed-in User, with the User as its Owner. */
export function SetUpPanel() {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [memberName, setMemberName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("GBP");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const home = getLocalePath("/", locale);

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        financePasskeyClient
          .setUp({ memberName, baseCurrency, locale })
          .then(() => {
            window.location.assign(home);
          })
          .catch((caught: unknown) => {
            const apiError = toApiError(caught);
            if (apiError.code === "already_set_up") {
              window.location.assign(home);
              return;
            }
            setError(apiError);
            setBusy(false);
          });
      }}
    >
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Welcome to Finance", zh: "欢迎使用家庭账本" })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "Give your name and base currency to start your household.",
            zh: "填写你的名字和本位币，开始记录你的家庭账本。",
          })}
        </Text>
      </div>
      {error === null ? null : (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <TextField
        label={t({ en: "Your name", zh: "你的名字" })}
        description={t({
          en: "Shown to the people you invite.",
          zh: "你邀请的家人会看到这个名字。",
        })}
        autoComplete="given-name"
        required
        maxLength={NAME_MAX_LENGTH}
        value={memberName}
        onChange={(event) => {
          setMemberName(event.target.value);
        }}
      />
      <Select
        label={t({ en: "Base currency", zh: "本位币" })}
        description={t({
          en: "Totals, net worth and statistics use it.",
          zh: "汇总、净资产和统计都使用此币种。",
        })}
        value={baseCurrency}
        options={currencyOptions("GBP", []).map((code) => ({
          value: code,
          label: code,
        }))}
        onChange={(event) => {
          setBaseCurrency(event.target.value);
        }}
      />
      <div css={stack.tight}>
        <Button
          type="submit"
          look="primary"
          size="lg"
          loading={busy}
          disabled={busy || signingOut}
          css={fill.inline}
        >
          {t({ en: "Start", zh: "开始" })}
        </Button>
        <Button
          type="button"
          look="ghost"
          loading={signingOut}
          disabled={busy || signingOut}
          css={fill.inline}
          onClick={() => {
            setSigningOut(true);
            void financePasskeyClient
              .signOut()
              .catch(() => undefined)
              .then(() => {
                window.location.assign(signInPath(locale));
              });
          }}
        >
          {t({ en: "Sign out", zh: "退出登录" })}
        </Button>
      </div>
    </form>
  );
}
