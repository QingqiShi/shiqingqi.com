"use client";

import * as stylex from "@stylexjs/stylex";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selected, selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useId, useMemo } from "react";
import { t } from "#src/i18n.ts";
import {
  type CreatureDef,
  EMOTIONS,
  type Emotion,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { elements } from "#src/pixel-creature-creator/sprite/sprites/index.ts";
import { OptionGrid } from "./option-grid";

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
    () => Object.values(elements).filter((tp) => tp !== undefined),
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
    <section css={stack.group} data-testid="wizard-step-vibe">
      <div css={stack.item}>
        <div css={stack.tight}>
          <h3 css={[typeRole.h3, styles.heading]} id={moodHeadingId}>
            {t({ en: "Pick a default mood", zh: "选择默认情绪" })}
          </h3>
          <p css={[typeRole.bodySmall, styles.hint]}>
            {t({
              en: "The preview reflects your choice immediately.",
              zh: "预览会立即反映你的选择。",
            })}
          </p>
        </div>
        <OptionGrid role="radiogroup" aria-labelledby={moodHeadingId}>
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              type="button"
              {...moodGroup.getOptionProps(emotion)}
              data-testid={`vibe-option-${emotion}`}
              css={[
                buttonReset.base,
                typeRole.label,
                styles.pill,
                selected.marked,
              ]}
            >
              {emotionLabels[emotion]}
            </button>
          ))}
        </OptionGrid>
      </div>

      <div css={stack.item}>
        <div css={stack.tight}>
          <h3 css={[typeRole.h3, styles.heading]} id={elementHeadingId}>
            {t({ en: "Pick an element", zh: "选择元素" })}
          </h3>
          <p css={[typeRole.bodySmall, styles.hint]}>
            {t({
              en: "Tints the sprite and seeds the creature's stats.",
              zh: "为精灵染色并影响生物的属性。",
            })}
          </p>
        </div>
        <OptionGrid role="radiogroup" aria-labelledby={elementHeadingId}>
          {typeEntries.map((tp) => (
            <button
              key={tp.id}
              type="button"
              {...typeGroup.getOptionProps(tp.id)}
              data-testid={`type-option-${tp.id}`}
              css={[buttonReset.base, styles.typeOption, selected.marked]}
            >
              <span
                title={tp.accentColor}
                css={[
                  styles.typeAccent,
                  styles.typeAccentColor(tp.accentColor),
                ]}
              />
              <span css={typeRole.label}>{typeLabels[tp.id] ?? tp.id}</span>
            </button>
          ))}
        </OptionGrid>
      </div>
    </section>
  );
}

const styles = stylex.create({
  heading: {
    margin: 0,
    color: color.fg,
  },
  hint: {
    color: color.fgMuted,
    margin: 0,
  },
  pill: {
    paddingBlock: space._2,
    paddingInline: space._4,
    [selectedTokens.rest]: color.bgSurface,
    borderRadius: "999px",
    cornerShape: "round",
    borderWidth: "2px",
    borderStyle: "solid",
    color: color.fg,
    transitionProperty: "border-color, background-color",
    transitionDuration: "120ms",
  },

  typeOption: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
    [selectedTokens.rest]: color.bgSurface,
    borderRadius: "12px",
    cornerShape: "squircle",
    borderWidth: "2px",
    borderStyle: "solid",
    color: color.fg,
    transitionProperty: "border-color, background-color",
    transitionDuration: "120ms",
    minWidth: "120px",
  },

  typeAccent: {
    width: "112px",
    height: "32px",
    borderRadius: "6px",
    cornerShape: "squircle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
  },
  typeAccentColor: (backgroundColor: string) => ({ backgroundColor }),
});
