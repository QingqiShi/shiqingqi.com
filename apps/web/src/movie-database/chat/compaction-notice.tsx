"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";

export function CompactionNotice() {
  return (
    <p css={styles.notice} role="status">
      <Text as="span" look="bodySmall" tone="muted">
        {t({
          en: "Context was summarized to continue the conversation.",
          zh: "已总结上下文以继续对话。",
        })}
      </Text>
    </p>
  );
}

const styles = stylex.create({
  notice: {
    margin: 0,
    fontStyle: "italic",
    paddingBlock: space._1,
  },
});
