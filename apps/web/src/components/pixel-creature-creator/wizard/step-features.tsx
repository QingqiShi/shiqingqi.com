"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { PixelLayer } from "../sprite/pixel-layer";
import { ACCESSORY_PALETTE, accessories } from "../sprite/sprites";
import type { CreatureDef } from "../state/creature-schema";
import { OptionGrid } from "./option-grid";

interface StepFeaturesProps {
  def: CreatureDef;
  onChange: (next: CreatureDef) => void;
}

const MAX_ACCESSORIES = 2;

export function StepFeatures({ def, onChange }: StepFeaturesProps) {
  const accessoryLabels: Record<string, string> = {
    hat: t({ en: "Hat", zh: "帽子" }),
    scarf: t({ en: "Scarf", zh: "围巾" }),
    antenna: t({ en: "Antenna", zh: "触角" }),
    glasses: t({ en: "Glasses", zh: "眼镜" }),
    leaf: t({ en: "Leaf", zh: "叶子" }),
    bow: t({ en: "Bow", zh: "蝴蝶结" }),
  };

  const selected = new Set(def.accessories);
  const atCap = selected.size >= MAX_ACCESSORIES;
  const capLabel = t({
    en: "Up to 2 accessories — deselect one to swap.",
    zh: "最多 2 件饰品 —— 取消选择以替换。",
  });

  return (
    <section css={styles.root} data-testid="wizard-step-features">
      <h3 css={styles.heading}>
        {t({
          en: "Pick up to 2 features",
          zh: "选择最多 2 件特征",
        })}
      </h3>
      <p css={styles.hint}>
        {t({
          en: "Accessories layer on top of the species. They share the elemental tint you pick next.",
          zh: "饰品叠加在物种之上,会随后续选择的元素染上同一色调。",
        })}
      </p>
      <OptionGrid>
        {Object.values(accessories).map((accessory) => {
          if (accessory === undefined) return null;
          const isSelected = selected.has(accessory.id);
          const disabledByCap = !isSelected && atCap;
          const handleClick = () => {
            const nextAccessories = isSelected
              ? def.accessories.filter((id) => id !== accessory.id)
              : [...def.accessories, accessory.id];
            if (nextAccessories.length > MAX_ACCESSORIES) return;
            onChange({ ...def, accessories: nextAccessories });
          };
          return (
            <button
              key={accessory.id}
              type="button"
              onClick={handleClick}
              disabled={disabledByCap}
              aria-pressed={isSelected}
              title={disabledByCap ? capLabel : undefined}
              data-testid={`accessory-option-${accessory.id}`}
              css={[
                styles.option,
                isSelected && styles.optionSelected,
                disabledByCap && styles.optionDisabled,
              ]}
            >
              <div css={styles.thumb}>
                <PixelLayer
                  tile={accessory.tile}
                  palette={ACCESSORY_PALETTE}
                  scale={3}
                />
              </div>
              <span css={styles.optionLabel}>
                {accessoryLabels[accessory.id] ?? accessory.id}
              </span>
            </button>
          );
        })}
      </OptionGrid>
      <p css={styles.counter} aria-live="polite">
        {t({ en: "Selected:", zh: "已选:" })} {String(selected.size)}/
        {String(MAX_ACCESSORIES)}
      </p>
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
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.5 },
    color: color.textMain,
    transitionProperty: "border-color, background-color",
    transitionDuration: "120ms",
  },
  optionSelected: {
    borderColor: color.controlActive,
    backgroundColor: color.backgroundHover,
  },
  optionDisabled: {
    // Locked accessory tile — visuals come from the option's `:disabled`
    // pseudo-class; this class is reserved for future locked-only flair.
  },
  thumb: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "96px",
    minHeight: "96px",
  },
  optionLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
  },
  counter: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
});
