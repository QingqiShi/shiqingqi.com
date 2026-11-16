"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import {
  toFinanceApiError,
  type FinanceApiError,
} from "../http/finance-api-error.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

/** Accepts an invite: the signed-in user joins as the invited Member. */
export function InvitePanel({ token }: { token: string }) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FinanceApiError | null>(null);

  return (
    <div css={stack.item}>
      {error ? (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      ) : null}
      <Button
        look="primary"
        size="lg"
        loading={busy}
        css={fill.inline}
        onClick={() => {
          setBusy(true);
          setError(null);
          financePasskeyClient
            .acceptInvite(token)
            .then(() => {
              window.location.assign(getLocalePath("/", locale));
            })
            .catch((caught: unknown) => {
              setError(toFinanceApiError(caught));
              setBusy(false);
            });
        }}
      >
        {t({ en: "Join", zh: "加入" })}
      </Button>
    </div>
  );
}
