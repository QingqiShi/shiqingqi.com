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

/** Allows the app to mark, flag and move the mail it classified. Off until the user turns it on. */
export function MailboxWritesToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = t({ en: "Tidy my mailboxes", zh: "整理我的邮箱" });

  return (
    <div css={stack.tight}>
      <div css={styles.row}>
        <div css={stack.text}>
          <Text weight="medium">{label}</Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The assistant marks each new mail as read and flags the mail that needs you or that it is unsure about. It moves filed mail into its category folder at once, mail worth knowing after it was in a digest, and flagged mail when you mark it done. It never deletes mail.",
              zh: "助手会把每封新邮件标为已读，并为需要你处理或它不确定的邮件加旗标。归档的邮件会立即移到对应分类的文件夹，“知道就好”的邮件在出现于摘要后移走，加旗标的邮件在你标记“已处理”后移走。它从不删除邮件。",
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
            assistantFetch("/api/settings/mailbox-writes", {
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
      <Text as="p" look="bodySmall" tone="muted">
        {t({
          en: "Mail the assistant sorted before you turn this on stays as it is: unread, unflagged and in the inbox. If a category has no folder in a mailbox, its mail stays in the inbox, marked read.",
          zh: "开启之前助手已分拣的邮件保持原样：不标已读、不加旗标、留在收件箱。如果某个分类在某个邮箱里没有对应的文件夹，这类邮件会标为已读并留在收件箱。",
        })}
      </Text>
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
