"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

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
    <div css={[flex.row, styles.banner]} role={hasError ? "alert" : undefined}>
      <p css={[styles.text, hasError && styles.errorText]}>{message}</p>
      <div css={[flex.row, styles.actions]}>
        <button
          type="button"
          css={[buttonReset.base, styles.dismissButton]}
          onClick={onDismiss}
          disabled={isPending}
        >
          {t({ en: "Dismiss", zh: "关闭" })}
        </button>
        <button
          type="button"
          css={[buttonReset.base, styles.continueButton]}
          onClick={onContinue}
          disabled={isPending}
          aria-busy={isPending || undefined}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  banner: {
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._4,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.controlTrack,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
  },
  text: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    flex: 1,
  },
  errorText: {
    color: color.textMain,
  },
  actions: {
    gap: space._2,
    alignItems: "center",
    flexShrink: 0,
  },
  dismissButton: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    backgroundColor: "transparent",
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
      ":disabled": color.textMuted,
    },
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    transition: "color 0.15s ease",
  },
  continueButton: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":disabled": color.controlActive,
    },
    color: color.textOnActive,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": 0.6,
    },
    transition: "background-color 0.15s ease, opacity 0.15s ease",
  },
});
