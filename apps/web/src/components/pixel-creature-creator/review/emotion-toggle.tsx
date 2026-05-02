"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { EMOTIONS, type Emotion } from "../state/creature-schema";

interface EmotionToggleProps {
  active: Emotion;
  onChange: (next: Emotion) => void;
}

/**
 * Horizontal row of 7 emotion buttons. The active button is highlighted with
 * `controlActive`. The row scrolls horizontally on narrow viewports
 * (<375px) so all 7 emotions stay reachable without truncation.
 *
 * The toggle owns no state of its own — the parent threads `active` and
 * `onChange` so the underlying creature def is never mutated.
 */
export function EmotionToggle({ active, onChange }: EmotionToggleProps) {
  // Inline labels so the i18n Babel plugin can extract them. Keeping the
  // record bound by `Emotion` means a new emotion in the schema fails the
  // type-check until we add the matching label here.
  const emotionLabels: Record<Emotion, string> = {
    idle: t({ en: "Idle", zh: "平静" }),
    joy: t({ en: "Joy", zh: "喜悦" }),
    sad: t({ en: "Sad", zh: "悲伤" }),
    excited: t({ en: "Excited", zh: "兴奋" }),
    sleepy: t({ en: "Sleepy", zh: "瞌睡" }),
    grumpy: t({ en: "Grumpy", zh: "生气" }),
    curious: t({ en: "Curious", zh: "好奇" }),
  };

  return (
    <div
      role="group"
      aria-label={t({ en: "Choose emotion", zh: "选择情绪" })}
      css={styles.root}
      data-testid="emotion-toggle"
    >
      {EMOTIONS.map((emotion) => {
        const isActive = emotion === active;
        return (
          <button
            key={emotion}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              onChange(emotion);
            }}
            data-testid={`emotion-button-${emotion}`}
            css={[styles.button, isActive && styles.buttonActive]}
          >
            {emotionLabels[emotion]}
          </button>
        );
      })}
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexWrap: "nowrap",
    gap: space._1,
    overflowX: "auto",
    paddingBlock: space._1,
    paddingInline: space._1,
    // `x mandatory` keeps each button neatly aligned when the row scrolls.
    scrollSnapType: "x mandatory",
  },
  button: {
    flexShrink: 0,
    scrollSnapAlign: "start",
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
      ":focus-visible": color.backgroundHover,
    },
    color: color.textMain,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "999px",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    cursor: "pointer",
    outlineOffset: "2px",
    transitionProperty: "background-color, border-color, color",
    transitionDuration: "120ms",
  },
  buttonActive: {
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":focus-visible": color.controlActiveHover,
    },
    color: color.textOnActive,
    borderColor: color.controlActive,
  },
});
