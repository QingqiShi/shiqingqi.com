"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { ORGANISE_NOTES_MAX_CHARS } from "../organise/organise-notes-max-chars.ts";

/** The user's rules on where mail goes, for the model that picks a folder. */
export function OrganiseNotesForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"saved" | "failed" | null>(null);

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        assistantFetch("/api/settings/organise-notes", {
          method: "PUT",
          body: JSON.stringify({ notes }),
        })
          .then(() => {
            setNotice("saved");
            router.refresh();
          })
          .catch(() => {
            setNotice("failed");
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <Textarea
        label={t({ en: "Your rules", zh: "你的规则" })}
        description={t({
          en: "Tell the assistant where mail goes, for example: “Bank and card mail goes to Finance.” Your rules come before its own judgement.",
          zh: "告诉助手邮件该放到哪里，例如：“银行和信用卡邮件放进‘财务’。”你的规则优先于它自己的判断。",
        })}
        rows={4}
        autoGrow
        maxLength={ORGANISE_NOTES_MAX_CHARS}
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setNotice(null);
        }}
      />
      {notice === "saved" ? (
        <Callout intent="success" role="status">
          {t({ en: "Rules saved.", zh: "规则已保存。" })}
        </Callout>
      ) : null}
      {notice === "failed" ? (
        <Callout intent="danger" role="alert">
          {t({
            en: "The rules were not saved. Try again.",
            zh: "规则没有保存成功，请重试。",
          })}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" look="primary" loading={busy}>
          {t({ en: "Save rules", zh: "保存规则" })}
        </Button>
      </div>
    </form>
  );
}
