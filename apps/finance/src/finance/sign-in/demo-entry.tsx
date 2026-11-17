"use client";

import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { toApiError, type ApiError } from "@tuja/auth-ui/api-error";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { useAuthErrorMessage } from "./use-auth-error-message.ts";

/** Opens the demo Household: made-up data that a visitor can change in this tab only. */
export function DemoEntry() {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  return (
    <div css={stack.item}>
      <div css={stack.text}>
        <Heading level={2} look="h3">
          {t({ en: "Look around first", zh: "先随便看看" })}
        </Heading>
        <Text tone="muted" look="bodySmall">
          {t({
            en: "Open a made-up household. You can change anything, but nothing is saved.",
            zh: "打开一个虚构的家庭。你可以随意修改，但不会保存任何更改。",
          })}
        </Text>
      </div>
      {error ? (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      ) : null}
      <Button
        look="outline"
        icon={<EyeIcon weight="bold" />}
        loading={busy}
        css={fill.inline}
        onClick={() => {
          setBusy(true);
          setError(null);
          financePasskeyClient
            .startDemo()
            .then(() => {
              window.location.assign(getLocalePath("/", locale));
            })
            .catch((caught: unknown) => {
              setError(toApiError(caught));
              setBusy(false);
            });
        }}
      >
        {t({ en: "Try the demo", zh: "试用演示" })}
      </Button>
    </div>
  );
}
