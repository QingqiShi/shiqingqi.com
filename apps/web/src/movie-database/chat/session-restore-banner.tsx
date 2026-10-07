"use client";

import * as stylex from "@stylexjs/stylex";
import { Card } from "@tuja/ui/components/card";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, opacity, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

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
      <p css={[typeRole.body, styles.text, hasError && styles.errorText]}>
        {message}
      </p>
      <div css={[flex.row, styles.actions]}>
        <button
          type="button"
          css={[
            typeRole.label,
            buttonReset.base,
            corner.radius_round,
            styles.dismissButton,
          ]}
          onClick={onDismiss}
          disabled={isPending}
        >
          {t({ en: "Dismiss", zh: "关闭" })}
        </button>
        <button
          type="button"
          css={[
            typeRole.label,
            buttonReset.base,
            corner.radius_round,
            styles.continueButton,
          ]}
          onClick={onContinue}
          disabled={isPending}
          aria-busy={isPending || undefined}
        >
          {continueLabel}
        </button>
      </div>
    </Card>
  );
}

const styles = stylex.create({
  text: {
    margin: 0,
    color: color.fgMuted,
    flex: 1,
  },
  errorText: {
    color: color.fg,
  },
  actions: {
    gap: rhythm.tight,
    alignItems: "center",
    flexShrink: 0,
  },
  dismissButton: {
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: "transparent",
    color: {
      default: color.fgMuted,
      ":hover": color.fg,
      ":disabled": color.fgMuted,
    },
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    transition: "color 0.15s ease",
  },
  continueButton: {
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: {
      default: color.bgAccent,
      ":hover": color.bgAccentHover,
      ":disabled": color.bgAccent,
    },
    color: color.fgOnAccent,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": opacity.disabled,
    },
    transition: "background-color 0.15s ease, opacity 0.15s ease",
  },
});
