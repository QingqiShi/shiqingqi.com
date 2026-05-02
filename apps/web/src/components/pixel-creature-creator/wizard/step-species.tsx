"use client";

import * as stylex from "@stylexjs/stylex";
import Image from "next/image";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { species } from "../sprite/species";
import type { CreatureDef } from "../state/creature-schema";

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

  return (
    <section css={styles.root} data-testid="wizard-step-species">
      <h3 css={styles.heading}>
        {t({ en: "Pick a species", zh: "选择物种" })}
      </h3>
      <p css={styles.hint}>
        {t({
          en: "16 hand-painted shapes. Each one has its own eyes and silhouette baked in.",
          zh: "16 种手绘造型。每一种都自带独特的眼神与轮廓。",
        })}
      </p>
      <div css={styles.grid}>
        {Object.values(species).map((entry) => {
          if (entry === undefined) return null;
          const selected = def.species === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                onChange({ ...def, species: entry.id });
              }}
              data-testid={`species-option-${entry.id}`}
              css={[styles.option, selected && styles.optionSelected]}
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
              <span css={styles.optionLabel}>
                {speciesLabels[entry.id] ?? entry.id}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const styles = stylex.create({
  root: {
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: space._2,
  },
  option: {
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
  },
  optionSelected: {
    borderColor: color.controlActive,
    backgroundColor: color.backgroundHover,
  },
  thumb: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: `${String(THUMB_PX)}px`,
    minHeight: `${String(THUMB_PX)}px`,
  },
  optionLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
  },
});
