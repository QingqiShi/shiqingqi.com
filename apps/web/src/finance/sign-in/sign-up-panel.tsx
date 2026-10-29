"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { currencyOptions } from "../accounts/currency-options.ts";
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

const NAME_MAX_LENGTH = 100;

/** Creates a User, and a Household named after them with them as its Owner, and saves a passkey on this device. */
export function SignUpPanel({ token, email }: SignUpPanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [memberName, setMemberName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("GBP");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        financePasskeyClient
          .signUp(token, {
            memberName,
            baseCurrency,
            locale,
          })
          .then(() => {
            window.location.assign(getLocalePath("/finance", locale));
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
          {t({ en: "Sign up for Finance", zh: "注册家庭账本" })}
        </Heading>
        <Text tone="muted">
          {`${t({ en: "Email confirmed: ", zh: "邮箱已确认：" })}${email}${t({
            en: ". Give your name and base currency, then save a passkey on this device.",
            zh: "。填写你的名字和本位币，然后在本设备上保存通行密钥。",
          })}`}
        </Text>
      </div>
      {error === null ? null : (
        <Callout intent="danger" role="alert">
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
      <Button
        type="submit"
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        disabled={busy}
        css={styles.wide}
      >
        {t({ en: "Save a passkey", zh: "保存通行密钥" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
