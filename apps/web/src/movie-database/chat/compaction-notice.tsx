"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";

export function CompactionNotice() {
  return (
    <p css={[typeRole.bodySmall, styles.notice]} role="status">
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
    color: color.fgMuted,
    fontStyle: "italic",
    paddingBlock: space._1,
  },
});
