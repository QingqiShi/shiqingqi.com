"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UndoOutcome } from "../activity/undo-agent-actions.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

type Refused = Extract<UndoOutcome, { undone: false }>;

/** What a refused undo says to the owner. */
function RefusalText({ outcome }: { outcome: Refused }) {
  return (
    <Text look="caption" css={styles.problem}>
      {refusalText(outcome)}
    </Text>
  );
}

function refusalText(outcome: Refused) {
  const folder = outcome.folder ?? "";
  switch (outcome.refusal) {
    case "mail-gone":
      return t({
        en: "The mail is no longer in {folder}, so it stays where it is now.",
        zh: "这封邮件已经不在“{folder}”里了，所以留在现在的位置。",
      }).replace("{folder}", folder);
    case "folder-gone":
      return t({
        en: "The folder {folder} no longer exists.",
        zh: "文件夹“{folder}”已经不存在了。",
      }).replace("{folder}", folder);
    case "folder-not-empty":
      return t({
        en: "{folder} holds mail now, so it stays.",
        zh: "“{folder}”里现在有邮件，所以保留它。",
      }).replace("{folder}", folder);
    case "folder-has-folders":
      return t({
        en: "{folder} holds other folders now, so it stays.",
        zh: "“{folder}”里现在有其他文件夹，所以保留它。",
      }).replace("{folder}", folder);
    case "folder-exists":
      return t({
        en: "A folder named {folder} exists already.",
        zh: "已经有名为“{folder}”的文件夹了。",
      }).replace("{folder}", folder);
    case "event-gone":
      return t({
        en: "The event is no longer in your calendar.",
        zh: "这个日程已经不在日历里了。",
      });
    case "event-changed":
      return t({
        en: "The event has changed in your calendar since, so it stays as it is.",
        zh: "这个日程之后在日历里改过，所以保持现状。",
      });
    case "account-gone":
      return t({
        en: "That mailbox is no longer connected.",
        zh: "这个邮箱已经断开连接了。",
      });
    case "failed":
      return t({
        en: "The mail or calendar server did not do it. Try again later.",
        zh: "邮件或日历服务器没有完成操作，请稍后再试。",
      });
  }
}

/**
 * Takes back some actions, or a whole run, and loads the page again. A run
 * asks once more first. What could not be undone stays, with why.
 */
export function UndoButton({
  target,
  label,
  confirm,
}: {
  target: { actionIds: string[] } | { runId: string };
  label: string;
  /** Asked before a larger undo, such as a whole run. */
  confirm?: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [refused, setRefused] = useState<Refused[]>([]);
  const [undone, setUndone] = useState(0);
  const [failed, setFailed] = useState(false);

  function run() {
    setAsking(false);
    setBusy(true);
    setFailed(false);
    assistantFetch("/api/activity/undo", {
      method: "POST",
      body: JSON.stringify(target),
    })
      .then(async (response) => {
        const { outcomes } = (await response.json()) as {
          outcomes: UndoOutcome[];
        };
        setRefused(outcomes.filter((outcome) => !outcome.undone));
        setUndone(outcomes.filter((outcome) => outcome.undone).length);
        startTransition(() => {
          router.refresh();
        });
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => {
        setBusy(false);
      });
  }

  const distinct = [
    ...new Map(
      refused.map((outcome) => [
        `${outcome.refusal}:${outcome.folder ?? ""}`,
        outcome,
      ]),
    ),
  ];
  const partly =
    refused.length > 0 && undone > 0
      ? t({
          en: "Undid {done} of {all}.",
          zh: "撤销了 {all} 项中的 {done} 项。",
        })
          .replace("{done}", String(undone))
          .replace("{all}", String(undone + refused.length))
      : null;

  return (
    <div css={[stack.tight, styles.wrap]}>
      <div css={styles.buttons}>
        {asking ? (
          <>
            <Button size="sm" look="outline" onClick={run}>
              {confirm}
            </Button>
            <Button
              size="sm"
              look="ghost"
              onClick={() => {
                setAsking(false);
              }}
            >
              {t({ en: "Keep", zh: "保留" })}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            look="ghost"
            loading={busy}
            disabled={busy}
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            onClick={() => {
              if (confirm) setAsking(true);
              else run();
            }}
          >
            {label}
          </Button>
        )}
      </div>
      <div role="status" css={stack.text}>
        {partly ? (
          <Text look="caption" css={styles.problem}>
            {partly}
          </Text>
        ) : null}
        {distinct.map(([key, outcome]) => (
          <RefusalText key={key} outcome={outcome} />
        ))}
        {failed ? (
          <Text look="caption" css={styles.problem}>
            {t({
              en: "That did not go through. Try again.",
              zh: "没有成功，请重试。",
            })}
          </Text>
        ) : null}
      </div>
    </div>
  );
}

const styles = stylex.create({
  wrap: {
    alignItems: "flex-end",
  },
  buttons: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: rhythm.inline,
  },
  problem: {
    color: color.fgDanger,
    textAlign: "end",
  },
});
