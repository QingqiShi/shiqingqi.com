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

/** The user's own words on where mail goes, for the model that picks a folder. */
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
        label={t({ en: "Where mail goes", zh: "邮件归到哪里" })}
        description={t({
          en: "Tell the assistant how you like your mail filed, for example: “Bank and card mail goes to Finance.” It picks one of your folders for each mail, and makes a new folder only for a new, lasting kind of mail.",
          zh: "告诉助手你希望邮件怎样归档，例如：“银行和信用卡邮件放进‘财务’。”它会为每封邮件选一个现有文件夹，只有遇到新的、会持续出现的一类邮件时才新建文件夹。",
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
          {t({ en: "Notes saved.", zh: "说明已保存。" })}
        </Callout>
      ) : null}
      {notice === "failed" ? (
        <Callout intent="danger" role="alert">
          {t({
            en: "The notes were not saved. Try again.",
            zh: "说明没有保存成功，请重试。",
          })}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" look="outline" loading={busy}>
          {t({ en: "Save notes", zh: "保存说明" })}
        </Button>
      </div>
    </form>
  );
}
