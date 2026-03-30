"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

interface SessionRestoreBannerProps {
  onContinue: () => void;
}

export function SessionRestoreBanner({
  onContinue,
}: SessionRestoreBannerProps) {
  return (
    <div css={[flex.row, styles.banner]}>
      <p css={styles.text}>
        {t({
          en: "You have a previous conversation",
          zh: "你有一段之前的对话",
        })}
      </p>
      <button
        type="button"
        css={[buttonReset.base, styles.continueButton]}
        onClick={onContinue}
      >
        {t({ en: "Continue", zh: "继续" })}
      </button>
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
    },
    color: color.textOnActive,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
});
