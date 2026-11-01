"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

type ItemAction = "done" | "not-important" | "should-show";

/**
 * The buttons of one digest item: open the mail, mark it done, and tell
 * the assistant it was wrong. A done or dismissed item shows its state
 * instead.
 */
export function ItemActions({
  ids,
  openHref,
  state,
  actions,
}: {
  ids: readonly string[];
  openHref: string;
  state: "open" | "done" | "dismissed";
  /** The actions this kind of item offers, besides opening the mail. */
  actions: readonly ItemAction[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<ItemAction | null>(null);
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState<ItemAction | null>(null);
  const labels: Record<ItemAction, string> = {
    done: t({ en: "Done", zh: "已处理" }),
    "not-important": t({ en: "Not important", zh: "不重要" }),
    "should-show": t({ en: "Show me these", zh: "应该给我看" }),
  };
  const shownState =
    settled === "done"
      ? "done"
      : settled === "not-important"
        ? "dismissed"
        : state;
  const isWeb = openHref.startsWith("https:");

  function run(action: ItemAction) {
    setBusy(action);
    setFailed(false);
    assistantFetch("/api/digest/items", {
      method: "POST",
      body: JSON.stringify({ action, ids }),
    })
      .then(() => {
        setSettled(action);
        router.refresh();
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => {
        setBusy(null);
      });
  }

  return (
    <div css={styles.row}>
      <AnchorButton
        href={openHref}
        size="sm"
        look="ghost"
        icon={<ArrowSquareOutIcon weight="bold" />}
        {...(isWeb ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {t({ en: "Open mail", zh: "打开原邮件" })}
      </AnchorButton>
      {shownState === "open" ? (
        actions
          .filter((action) => settled !== action)
          .map((action) => (
            <Button
              key={action}
              size="sm"
              look="ghost"
              icon={action === "done" ? <CheckIcon weight="bold" /> : undefined}
              loading={busy === action}
              disabled={busy !== null}
              onClick={() => {
                run(action);
              }}
            >
              {labels[action]}
            </Button>
          ))
      ) : (
        <Text look="caption" tone="muted" css={styles.state}>
          {shownState === "done"
            ? t({ en: "Done", zh: "已处理" })
            : t({ en: "Marked not important", zh: "已标为不重要" })}
        </Text>
      )}
      {settled === "should-show" ? (
        <Text look="caption" tone="muted" css={styles.state}>
          {t({ en: "Noted", zh: "已记下" })}
        </Text>
      ) : null}
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
    columnGap: rhythm.inline,
    rowGap: rhythm.inline,
    marginInlineStart: `calc(-1 * ${rhythm.tight})`,
  },
  state: {
    paddingInline: rhythm.tight,
  },
  failed: {
    color: color.fgDanger,
    paddingInline: rhythm.tight,
  },
});
