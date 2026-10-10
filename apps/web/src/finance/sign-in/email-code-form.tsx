"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState, type ReactNode } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

interface EmailCodeFormProps {
  /** The text above the email field. */
  intro: ReactNode;
  label: string;
  submitLabel: string;
  /** The status above the code field, which names the address. */
  sentMessage: (email: string) => string;
  send: (email: string, locale: SupportedLocale) => Promise<void>;
  /**
   * Checks the typed code. It resolves when the flow goes on, to another
   * page or to a view that replaces this form, so the form stays busy.
   */
  verify: (code: string) => Promise<void>;
}

/**
 * Asks for an email, then for the code in the email that it sent. The
 * email's link is the other way in, on any device.
 */
export function EmailCodeForm({
  intro,
  label,
  submitLabel,
  sentMessage,
  send,
  verify,
}: EmailCodeFormProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);

  const errorCallout =
    error === null ? null : (
      <Callout intent="danger" role="alert">
        {messageOf(error)}
      </Callout>
    );

  if (step === "email") {
    return (
      <form
        css={stack.item}
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          send(email, locale)
            .then(() => {
              setCode("");
              setStep("code");
            })
            .catch((caught: unknown) => {
              setError(toFinanceApiError(caught));
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {intro}
        {errorCallout}
        <TextField
          label={label}
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
          look="outline"
          loading={busy}
          disabled={busy}
          css={styles.wide}
        >
          {submitLabel}
        </Button>
      </form>
    );
  }

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        verify(code).catch((caught: unknown) => {
          const apiError = toFinanceApiError(caught);
          setError(apiError);
          if (apiError.code === "code_expired") setStep("email");
          setBusy(false);
        });
      }}
    >
      <Callout intent="info" role="status">
        {sentMessage(email.trim())}
      </Callout>
      {errorCallout}
      <TextField
        label={t({ en: "Code", zh: "验证码" })}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        maxLength={12}
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
        }}
      />
      <Button
        type="submit"
        look="primary"
        loading={busy}
        disabled={busy}
        css={styles.wide}
      >
        {t({ en: "Continue", zh: "继续" })}
      </Button>
      <Button
        look="ghost"
        disabled={busy}
        css={styles.wide}
        onClick={() => {
          setError(null);
          setStep("email");
        }}
      >
        {t({ en: "Use another email", zh: "换一个邮箱" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
