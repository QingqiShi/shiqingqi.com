"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

/** Lets the app file inbox mail into folders. Off until the user turns it on. */
export function OrganiseToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = t({ en: "Organise my inbox", zh: "整理我的收件箱" });

  return (
    <div css={stack.tight}>
      <div css={styles.row}>
        <div css={stack.text}>
          <Text weight="medium">{label}</Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Every 15 minutes an AI agent goes through your inbox: it files your mail, moves spam to Junk, flags mail that needs you, and tidies your folders. It leaves mail unread. The first runs work through your whole existing inbox. It never deletes or sends mail.",
              zh: "AI 智能体每 15 分钟处理一遍收件箱：把邮件归入文件夹，把垃圾邮件移到垃圾邮件箱，为需要你处理的邮件加旗标，并整理你的文件夹。它不会把邮件标为已读。最初几次会处理你现有的整个收件箱。它从不删除或发送邮件。",
            })}
          </Text>
        </div>
        <Switch
          aria-label={label}
          value={enabled ? "on" : "off"}
          disabled={busy}
          onChange={(next) => {
            const wanted = next === "on";
            setBusy(true);
            setFailed(false);
            assistantFetch("/api/settings/organise", {
              method: "PUT",
              body: JSON.stringify({ enabled: wanted }),
            })
              .then(() => {
                setEnabled(wanted);
                router.refresh();
              })
              .catch(() => {
                setFailed(true);
              })
              .finally(() => {
                setBusy(false);
              });
          }}
        />
      </div>
      <div role="status">
        {failed ? (
          <Text as="p" look="bodySmall">
            {t({
              en: "That did not work. Try again.",
              zh: "没有成功，请重试。",
            })}
          </Text>
        ) : null}
      </div>
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
  },
});
