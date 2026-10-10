"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState, type SubmitEvent } from "react";
import { t } from "#src/i18n.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useToast } from "../shell/toast-provider.tsx";

interface CredentialFormProps {
  /** Replacing a key the Connection already has, rather than connecting. */
  replacing?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}

/** The owner pastes the Household's Lunch Flow API key; the server checks it with Lunch Flow before it keeps it. */
export function CredentialForm({
  replacing = false,
  onSaved,
  onCancel,
}: CredentialFormProps) {
  const showToast = useToast();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const messages = {
    empty: t({
      en: "Paste the whole API key from Lunch Flow.",
      zh: "请粘贴 Lunch Flow 中完整的 API 密钥。",
    }),
    refused: t({
      en: "Lunch Flow did not accept this key. Copy it again from Lunch Flow.",
      zh: "Lunch Flow 不接受这个密钥。请从 Lunch Flow 重新复制。",
    }),
    notReady: t({
      en: "This server cannot store keys yet.",
      zh: "此服务器暂时无法保存密钥。",
    }),
    failed: t({
      en: "The key did not save. Try again when you are online.",
      zh: "密钥未能保存，请联网后重试。",
    }),
    saved: t({ en: "Lunch Flow connected", zh: "已连接 Lunch Flow" }),
    replaced: t({ en: "API key replaced", zh: "API 密钥已更换" }),
  };

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (apiKey.trim().length < 8) {
      setError(messages.empty);
      return;
    }
    setSaving(true);
    try {
      await bankApiClient.putCredential(apiKey.trim());
      setApiKey("");
      showToast({
        message: replacing ? messages.replaced : messages.saved,
        durationMs: 4000,
      });
      onSaved();
    } catch (failure) {
      const messageOf: Partial<Record<string, string>> = {
        auth: messages.refused,
        "invalid-body": messages.empty,
        "not-configured": messages.notReady,
      };
      setError(
        (failure instanceof FinanceApiError
          ? messageOf[failure.code]
          : undefined) ?? messages.failed,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void save(event)}
      css={[stack.item, styles.form]}
      noValidate
    >
      <TextField
        type="password"
        autoComplete="off"
        spellCheck={false}
        label={t({ en: "Lunch Flow API key", zh: "Lunch Flow API 密钥" })}
        description={t({
          en: "Create a key in Lunch Flow and paste it. Only the server keeps it.",
          zh: "在 Lunch Flow 中创建密钥后粘贴到这里。密钥只保存在服务器上。",
        })}
        value={apiKey}
        error={error}
        onChange={(event) => {
          setApiKey(event.target.value);
          setError(undefined);
        }}
      />
      <div css={cluster.tight}>
        <Button type="submit" look="primary" loading={saving}>
          {replacing
            ? t({ en: "Replace key", zh: "更换密钥" })
            : t({ en: "Connect", zh: "连接" })}
        </Button>
        {onCancel ? (
          <Button look="ghost" disabled={saving} onClick={onCancel}>
            {t({ en: "Cancel", zh: "取消" })}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "32rem",
  },
});
