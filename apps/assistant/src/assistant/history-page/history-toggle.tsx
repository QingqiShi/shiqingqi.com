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

/** Starts or pauses history import. */
export function HistoryToggle({
  initial,
  estimate,
}: {
  initial: boolean;
  /** What the classification of the rest of the old mail costs, as a sentence. */
  estimate: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = t({ en: "Import my old mail", zh: "导入我的旧邮件" });

  return (
    <div css={stack.tight}>
      <div css={styles.row}>
        <div css={stack.text}>
          <Text weight="medium">{label}</Text>
          <Text look="bodySmall" tone="muted">
            {estimate}
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
            assistantFetch("/api/history", {
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
