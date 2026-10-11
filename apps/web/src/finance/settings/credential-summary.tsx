"use client";

import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import type { CredentialView } from "../bank/types.ts";
import { displayMoment } from "../domain/dates/display-moment.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { CredentialForm } from "./credential-form.tsx";

interface CredentialSummaryProps {
  credential: CredentialView;
  editable: boolean;
  onChanged: () => void;
}

/** Which key the Connection uses, by its last four characters, with the owner's Replace and Remove. */
export function CredentialSummary({
  credential,
  editable,
  onChanged,
}: CredentialSummaryProps) {
  const locale = useLocale();
  const showToast = useToast();
  const [step, setStep] = useState<"view" | "replace" | "remove">("view");
  const [removing, setRemoving] = useState(false);
  const messages = {
    removed: t({ en: "API key removed", zh: "API 密钥已移除" }),
    failed: t({
      en: "The key was not removed. Try again when you are online.",
      zh: "密钥未能移除，请联网后重试。",
    }),
  };

  async function remove() {
    setRemoving(true);
    try {
      await bankApiClient.removeCredential();
      showToast({ message: messages.removed, durationMs: 4000 });
      onChanged();
    } catch {
      showToast({ message: messages.failed });
      setRemoving(false);
    }
  }

  return (
    <div css={stack.tight}>
      <Text look="bodySmall">
        {`${t({ en: "API key ending in", zh: "API 密钥末四位" })} ${credential.lastFour} · ${t({ en: "saved", zh: "保存于" })} ${displayMoment(credential.savedAt, locale)}`}
      </Text>
      {!editable ? null : step === "replace" ? (
        <CredentialForm
          replacing
          onSaved={onChanged}
          onCancel={() => {
            setStep("view");
          }}
        />
      ) : step === "remove" ? (
        <Callout
          intent="warning"
          title={t({ en: "Remove the API key?", zh: "移除 API 密钥？" })}
        >
          <div css={stack.tight}>
            <Text look="bodySmall">
              {t({
                en: "Bank links stay, but nothing syncs until you add a key again.",
                zh: "银行关联会保留，但在重新添加密钥之前不会同步。",
              })}
            </Text>
            <div css={cluster.tight}>
              <Button
                size="sm"
                look="danger"
                loading={removing}
                onClick={() => void remove()}
              >
                {t({ en: "Remove key", zh: "移除密钥" })}
              </Button>
              <Button
                size="sm"
                look="ghost"
                disabled={removing}
                onClick={() => {
                  setStep("view");
                }}
              >
                {t({ en: "Cancel", zh: "取消" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : (
        <div css={cluster.tight}>
          <Button
            size="sm"
            look="outline"
            onClick={() => {
              setStep("replace");
            }}
          >
            {t({ en: "Replace key", zh: "更换密钥" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            onClick={() => {
              setStep("remove");
            }}
          >
            {t({ en: "Remove key", zh: "移除密钥" })}
          </Button>
        </div>
      )}
    </div>
  );
}
