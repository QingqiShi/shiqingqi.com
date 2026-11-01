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

/** Lets the app write the events it is sure about to the user's iCloud Calendar. On by default. */
export function CalendarToggle({
  initial,
  address,
}: {
  initial: boolean;
  /** The iCloud account whose calendar the app writes to. */
  address: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = t({
    en: "Add events to my calendar",
    zh: "把安排加入我的日历",
  });

  return (
    <div css={stack.tight}>
      <div css={styles.row}>
        <div css={stack.text}>
          <Text weight="medium">{label}</Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Appointments, trips and deadlines from new mail go into the “Mail Assistant” calendar of {address}, with alarms. A later mail in the same thread moves or removes the event. Events the assistant is unsure about wait in the digest for you to add.",
              zh: "新邮件里的预约、行程和截止日期会写入 {address} 的“邮件助手”日历，并设置提醒。同一封邮件往来中后续的改期或取消会更新或删除这个安排。助手拿不准的安排会留在摘要里，由你决定是否加入。",
            }).replace("{address}", address)}
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
            assistantFetch("/api/settings/calendar", {
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
          en: "The assistant reads your other calendars only to skip events that are there already, such as invitations you accepted. It never changes them.",
          zh: "助手读取你的其他日历，只是为了跳过已经存在的安排（比如你已接受的邀请），从不改动它们。",
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
