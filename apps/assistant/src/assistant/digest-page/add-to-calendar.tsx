"use client";

import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr/CalendarPlus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

/** 加入日历 for an event the assistant did not write on its own; for a cancellation, removes the event. */
export function AddToCalendar({
  classificationId,
  cancel,
}: {
  classificationId: string;
  cancel: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div css={styles.row}>
      <Button
        size="sm"
        look="ghost"
        icon={
          cancel ? (
            <TrashIcon weight="bold" />
          ) : (
            <CalendarPlusIcon weight="bold" />
          )
        }
        loading={busy}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setFailed(false);
          assistantFetch("/api/calendar/events", {
            method: "POST",
            body: JSON.stringify({ classificationId }),
          })
            .then(() => {
              router.refresh();
            })
            .catch(() => {
              setFailed(true);
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {cancel
          ? t({ en: "Remove from calendar", zh: "从日历删除" })
          : t({ en: "Add to calendar", zh: "加入日历" })}
      </Button>
      <span role="status">
        {failed ? (
          <Text look="caption" css={styles.failed}>
            {t({
              en: "That did not work. Try again.",
              zh: "没有成功，请重试。",
            })}
          </Text>
        ) : null}
      </span>
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.inline,
    marginInlineStart: `calc(-1 * ${rhythm.tight})`,
  },
  failed: {
    color: color.fgDanger,
    paddingInline: rhythm.tight,
  },
});
