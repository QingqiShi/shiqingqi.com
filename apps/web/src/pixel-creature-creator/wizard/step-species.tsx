"use client";

import * as stylex from "@stylexjs/stylex";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selected, selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import Image from "next/image";
import { useId, useMemo } from "react";
import { t } from "#src/i18n.ts";
import type { CreatureDef } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { species } from "#src/pixel-creature-creator/sprite/species/index.ts";

interface StepSpeciesProps {
  def: CreatureDef;
  onChange: (next: CreatureDef) => void;
}

const THUMB_PX = 96;

export function StepSpecies({ def, onChange }: StepSpeciesProps) {
  // Resolve every label statically so the i18n Babel plugin sees literal
  // `{ en, zh }` records — the registry's labels can't be passed through
  // `t()` directly because the plugin needs compile-time keys.
  const speciesLabels: Record<string, string> = {
    feline: t({ en: "Feline", zh: "猫科" }),
    canine: t({ en: "Canine", zh: "犬科" }),
    avian: t({ en: "Avian", zh: "鸟类" }),
    reptilian: t({ en: "Reptilian", zh: "爬虫" }),
    dinosaurian: t({ en: "Dinosaurian", zh: "恐龙" }),
    insectoid: t({ en: "Insectoid", zh: "昆虫" }),
    "worm-like": t({ en: "Worm-like", zh: "蠕虫" }),
    serpentine: t({ en: "Serpentine", zh: "蛇形" }),
    piscine: t({ en: "Piscine", zh: "鱼类" }),
    amphibian: t({ en: "Amphibian", zh: "两栖" }),
    "plant-like": t({ en: "Plant-like", zh: "植物" }),
    humanoid: t({ en: "Humanoid", zh: "人形" }),
    "object-based": t({ en: "Object", zh: "器物" }),
    robotic: t({ en: "Robotic", zh: "机械" }),
    draconic: t({ en: "Draconic", zh: "龙形" }),
    amorphous: t({ en: "Amorphous", zh: "不定形" }),
  };

  const entries = useMemo(
    () => Object.values(species).filter((entry) => entry !== undefined),
    [],
  );
  const speciesIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const { getOptionProps } = useRadioGroup({
    values: speciesIds,
    value: def.species,
    onChange: (next) => {
      onChange({ ...def, species: next });
    },
  });
  const headingId = useId();

  return (
    <section css={stack.item} data-testid="wizard-step-species">
      <div css={stack.tight}>
        <h3 css={[typeRole.h3, styles.heading]} id={headingId}>
          {t({ en: "Pick a species", zh: "选择物种" })}
        </h3>
        <p css={[typeRole.bodySmall, styles.hint]}>
          {t({
            en: "16 hand-painted shapes. Each one has its own eyes and silhouette baked in.",
            zh: "16 种手绘造型。每一种都自带独特的眼神与轮廓。",
          })}
        </p>
      </div>
      <div css={styles.grid} role="radiogroup" aria-labelledby={headingId}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            {...getOptionProps(entry.id)}
            data-testid={`species-option-${entry.id}`}
            css={[
              buttonReset.base,
              styles.option,
              selected.marked,
              transition.colors,
            ]}
          >
            <div css={styles.thumb}>
              <Image
                src={entry.idle}
                alt=""
                width={THUMB_PX}
                height={THUMB_PX}
                unoptimized
                style={{
                  width: `${String(THUMB_PX)}px`,
                  height: `${String(THUMB_PX)}px`,
                  imageRendering: "pixelated",
                  display: "block",
                }}
              />
            </div>
            <span css={typeRole.label}>
              {speciesLabels[entry.id] ?? entry.id}
            </span>
          </button>
        ))}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: rhythm.item,
  },
  option: {
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
  },

  thumb: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: `${String(THUMB_PX)}px`,
    minHeight: `${String(THUMB_PX)}px`,
  },
});
