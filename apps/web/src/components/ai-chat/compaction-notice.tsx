"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

export function CompactionNotice() {
  return (
    <p css={styles.notice} role="status">
      {t({
        en: "Context was summarized to continue the conversation.",
        zh: "已总结上下文以继续对话。",
      })}
    </p>
  );
}

const styles = stylex.create({
  notice: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
    paddingBlock: space._1,
  },
});
