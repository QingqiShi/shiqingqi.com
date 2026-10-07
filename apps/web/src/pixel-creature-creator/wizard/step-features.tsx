"use client";

import * as stylex from "@stylexjs/stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, opacity, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import type { CreatureDef } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { PixelLayer } from "#src/pixel-creature-creator/sprite/pixel-layer.tsx";
import {
  ACCESSORY_PALETTE,
  accessories,
} from "#src/pixel-creature-creator/sprite/sprites/index.ts";
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
    <section css={stack.item} data-testid="wizard-step-features">
      <div css={stack.tight}>
        <h3 css={[typeRole.h3, styles.heading]}>
          {t({
            en: "Pick up to 2 features",
            zh: "选择最多 2 件特征",
          })}
        </h3>
        <p css={[typeRole.bodySmall, styles.hint]}>
          {t({
            en: "Accessories layer on top of the species. They share the elemental tint you pick next.",
            zh: "饰品叠加在物种之上,会随后续选择的元素染上同一色调。",
          })}
        </p>
      </div>
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
                transition.colors,
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
              <span css={typeRole.label}>
                {accessoryLabels[accessory.id] ?? accessory.id}
              </span>
            </button>
          );
        })}
      </OptionGrid>
      <p css={[typeRole.bodySmall, styles.counter]} aria-live="polite">
        {t({ en: "Selected:", zh: "已选:" })} {String(selected.size)}/
        {String(MAX_ACCESSORIES)}
      </p>
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
  option: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgControlHover,
    },
    borderRadius: "12px",
    cornerShape: "squircle",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
    color: color.fg,
  },
  optionSelected: {
    borderColor: color.borderAccent,
    backgroundColor: color.bgSurfaceRaised,
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
  counter: {
    color: color.fgMuted,
    margin: 0,
  },
});
