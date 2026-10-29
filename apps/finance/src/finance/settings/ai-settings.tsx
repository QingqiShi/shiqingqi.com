"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Textarea } from "@tuja/ui/components/textarea";
import { useToast } from "@tuja/ui/components/toast-provider";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState, type SubmitEvent } from "react";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { withPending } from "../shell/with-pending.ts";
import { householdApiClient } from "./household-api-client.ts";
import { MAX_AI_INSTRUCTIONS_LENGTH } from "./max-ai-instructions-length.ts";
import { SettingsPanel } from "./settings-panel.tsx";

/** The instructions the AI follows when it labels the Household's bank rows. Any Member may edit them. */
export function AiSettings() {
  const locale = useLocale();
  const household = useReplica((snapshot) => snapshot.household);
  const { runtime, readOnly } = useFinanceRuntime();
  const showToast = useToast();
  const [text, setText] = useState(household?.aiInstructions ?? "");
  const [saving, setSaving] = useState(false);
  const messages = {
    saved: t({ en: "AI instructions saved", zh: "AI 说明已保存" }),
    failed: t({
      en: "The instructions did not save. Try again when you are online.",
      zh: "说明未能保存，请联网后重试。",
    }),
    characters: t({ en: "characters", zh: "字符" }),
  };
  if (!household) return null;
  const changed = text.trim() !== household.aiInstructions;
  const numbers = new Intl.NumberFormat(locale);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await withPending(setSaving, async () => {
      try {
        await householdApiClient.setAiInstructions(text.trim());
        await runtime.loop.sync();
        showToast({ message: messages.saved, durationMs: 4000 });
      } catch {
        showToast({ message: messages.failed });
      }
    });
  }

  return (
    <SettingsPanel
      title={t({ en: "AI labelling", zh: "智能标注" })}
      description={t({
        en: "The AI labels new bank rows and copies how your household labelled similar ones. Tell it what it cannot see: whose account is whose, what a transfer is for, which shop counts as what.",
        zh: "AI 会标注新的银行流水，并参照家庭以往类似交易的标注。告诉它看不到的信息：哪个账户是谁的、某笔转账是做什么的、某家店算哪个分类。",
      })}
    >
      <form
        onSubmit={(event) => void save(event)}
        css={[stack.item, styles.form]}
        noValidate
      >
        <Textarea
          label={t({ en: "Instructions for the AI", zh: "给 AI 的说明" })}
          description={`${numbers.format(text.length)} / ${numbers.format(MAX_AI_INSTRUCTIONS_LENGTH)} ${messages.characters}`}
          placeholder={t({
            en: "Payments to J SMITH are rent. Waitrose is groceries, except at Christmas. Write reasons in English.",
            zh: "转给 J SMITH 的钱是房租。Waitrose 算买菜，圣诞节除外。用中文写理由。",
          })}
          value={text}
          readOnly={readOnly}
          maxLength={MAX_AI_INSTRUCTIONS_LENGTH}
          rows={8}
          autoGrow
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        {readOnly ? null : (
          <div>
            <Button
              type="submit"
              look="primary"
              disabled={!changed}
              loading={saving}
            >
              {t({ en: "Save", zh: "保存" })}
            </Button>
          </div>
        )}
      </form>
    </SettingsPanel>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "40rem",
  },
});
