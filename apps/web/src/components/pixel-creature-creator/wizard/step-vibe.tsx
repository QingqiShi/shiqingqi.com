"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, useMemo } from "react";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { types } from "../sprite/sprites";
import {
  type CreatureDef,
  EMOTIONS,
  type Emotion,
} from "../state/creature-schema";
import { OptionGrid } from "./option-grid";
import { useRadioGroup } from "./use-radio-group";

interface StepVibeProps {
  def: CreatureDef;
  onChange: (next: CreatureDef) => void;
}

export function StepVibe({ def, onChange }: StepVibeProps) {
  const emotionLabels: Record<Emotion, string> = {
    idle: t({ en: "Idle", zh: "平静" }),
    joy: t({ en: "Joy", zh: "喜悦" }),
    sad: t({ en: "Sad", zh: "悲伤" }),
    excited: t({ en: "Excited", zh: "兴奋" }),
    sleepy: t({ en: "Sleepy", zh: "瞌睡" }),
    grumpy: t({ en: "Grumpy", zh: "生气" }),
    curious: t({ en: "Curious", zh: "好奇" }),
  };
  const typeLabels: Record<string, string> = {
    leaf: t({ en: "Leaf", zh: "叶系" }),
    ember: t({ en: "Ember", zh: "余烬系" }),
    tide: t({ en: "Tide", zh: "潮汐系" }),
    dust: t({ en: "Dust", zh: "尘土系" }),
    glow: t({ en: "Glow", zh: "微光系" }),
    frost: t({ en: "Frost", zh: "霜冻系" }),
    dawn: t({ en: "Dawn", zh: "黎明系" }),
    void: t({ en: "Void", zh: "虚空系" }),
  };

  const moodHeadingId = useId();
  const elementHeadingId = useId();

  const moodGroup = useRadioGroup({
    values: EMOTIONS,
    value: def.defaultEmotion,
    onChange: (next) => {
      onChange({ ...def, defaultEmotion: next });
    },
  });

  const typeEntries = useMemo(
    () => Object.values(types).filter((tp) => tp !== undefined),
    [],
  );
  const typeIds = useMemo(() => typeEntries.map((tp) => tp.id), [typeEntries]);
  const typeGroup = useRadioGroup({
    values: typeIds,
    value: def.type,
    onChange: (next) => {
      onChange({ ...def, type: next });
    },
  });

  return (
    <section css={styles.root} data-testid="wizard-step-vibe">
      <div css={styles.subsection}>
        <h3 css={styles.heading} id={moodHeadingId}>
          {t({ en: "Pick a default mood", zh: "选择默认情绪" })}
        </h3>
        <p css={styles.hint}>
          {t({
            en: "The preview reflects your choice immediately.",
            zh: "预览会立即反映你的选择。",
          })}
        </p>
        <OptionGrid role="radiogroup" aria-labelledby={moodHeadingId}>
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              type="button"
              {...moodGroup.getOptionProps(emotion)}
              data-testid={`vibe-option-${emotion}`}
              css={[
                styles.pill,
                def.defaultEmotion === emotion && styles.pillSelected,
              ]}
            >
              {emotionLabels[emotion]}
            </button>
          ))}
        </OptionGrid>
      </div>

      <div css={styles.subsection}>
        <h3 css={styles.heading} id={elementHeadingId}>
          {t({ en: "Pick an element", zh: "选择元素" })}
        </h3>
        <p css={styles.hint}>
          {t({
            en: "Tints the sprite and seeds the creature's stats.",
            zh: "为精灵染色并影响生物的属性。",
          })}
        </p>
        <OptionGrid role="radiogroup" aria-labelledby={elementHeadingId}>
          {typeEntries.map((tp) => (
            <button
              key={tp.id}
              type="button"
              {...typeGroup.getOptionProps(tp.id)}
              data-testid={`type-option-${tp.id}`}
              css={[
                styles.typeOption,
                def.type === tp.id && styles.typeOptionSelected,
              ]}
            >
              <span
                style={{ backgroundColor: tp.accentColor }}
                css={styles.typeAccent}
                title={tp.accentColor}
              />
              <span css={styles.optionLabel}>{typeLabels[tp.id] ?? tp.id}</span>
            </button>
          ))}
        </OptionGrid>
      </div>
    </section>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  subsection: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  heading: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_6,
    margin: 0,
    color: color.textMain,
  },
  hint: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
  pill: {
    paddingBlock: space._2,
    paddingInline: space._4,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
    },
    borderRadius: "999px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    transitionProperty: "border-color, background-color",
    transitionDuration: "120ms",
  },
  pillSelected: {
    borderColor: color.controlActive,
    backgroundColor: color.backgroundHover,
  },
  typeOption: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._1,
    padding: space._2,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
    },
    borderRadius: "12px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    color: color.textMain,
    transitionProperty: "border-color, background-color",
    transitionDuration: "120ms",
    minWidth: "120px",
  },
  typeOptionSelected: {
    borderColor: color.controlActive,
    backgroundColor: color.backgroundHover,
  },
  typeAccent: {
    width: "112px",
    height: "32px",
    borderRadius: "6px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
  },
  optionLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
  },
});
