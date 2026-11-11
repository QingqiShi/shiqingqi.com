"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";

interface SessionRestoreBannerProps {
  onContinue: () => void;
  onDismiss: () => void;
  isPending?: boolean;
  hasError?: boolean;
}

export function SessionRestoreBanner({
  onContinue,
  onDismiss,
  isPending = false,
  hasError = false,
}: SessionRestoreBannerProps) {
  const message = hasError
    ? t({
        en: "Couldn't restore that conversation. Try again or dismiss.",
        zh: "无法恢复之前的对话。请重试或关闭。",
      })
    : t({
        en: "You have a previous conversation",
        zh: "你有一段之前的对话",
      });

  const continueLabel = isPending
    ? t({ en: "Continuing…", zh: "恢复中…" })
    : hasError
      ? t({ en: "Try again", zh: "重试" })
      : t({ en: "Continue", zh: "继续" });

  return (
    <Card css={row.item} role={hasError ? "alert" : undefined}>
      <Text
        tone={hasError ? undefined : "muted"}
        measure="none"
        css={styles.text}
      >
        {message}
      </Text>
      <div css={[flex.row, styles.actions]}>
        <Button look="ghost" size="sm" onClick={onDismiss} disabled={isPending}>
          {t({ en: "Dismiss", zh: "关闭" })}
        </Button>
        <Button
          look="primary"
          size="sm"
          onClick={onContinue}
          disabled={isPending}
          aria-busy={isPending || undefined}
        >
          {continueLabel}
        </Button>
      </div>
    </Card>
  );
}

const styles = stylex.create({
  text: {
    flex: 1,
  },
  actions: {
    gap: rhythm.tight,
    alignItems: "center",
    flexShrink: 0,
  },
});
