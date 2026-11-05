"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole, typeModifier } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { Tool } from "./types";

const DEFAULT_PALETTE = [
  "#000000",
  "#ffffff",
  "#f3eded",
  "#ff8000",
  "#a855f7",
  "#0ea5e9",
  "#10b981",
  "#fbbf24",
  "#ef4444",
  "#1ecc5a",
];

interface ColorRowProps {
  tool: Tool;
  activeColor: string;
  onColorChange: (hex: string) => void;
  recent: readonly string[];
  onRemember: (hex: string) => void;
  tolerance: number;
  onToleranceChange: (tolerance: number) => void;
}

export function ColorRow({
  tool,
  activeColor,
  onColorChange,
  recent,
  onRemember,
  tolerance,
  onToleranceChange,
}: ColorRowProps) {
  return (
    <div css={[corner.radius_2, styles.colorRow]}>
      <label css={[typeRole.label, styles.colorLabel]}>
        <span>{t({ en: "Color", zh: "颜色" })}</span>
        <input
          type="color"
          value={activeColor}
          onChange={(event) => {
            onColorChange(event.target.value);
          }}
          css={[corner.radius_2, a11y.focusRing, styles.colorInput]}
          data-testid="color-input"
        />
      </label>
      <div css={styles.swatches}>
        {DEFAULT_PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={hex}
            onClick={() => {
              onColorChange(hex);
              onRemember(hex);
            }}
            css={[
              buttonReset.base,
              styles.swatch,
              activeColor === hex && styles.swatchActive,
              styles.swatchColor(hex),
            ]}
          />
        ))}
      </div>
      {recent.length > 0 ? (
        <div
          css={styles.swatches}
          aria-label={t({ en: "Recent colors", zh: "最近颜色" })}
        >
          {recent.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onClick={() => {
                onColorChange(hex);
              }}
              css={[
                buttonReset.base,
                styles.swatch,
                activeColor === hex && styles.swatchActive,
                styles.swatchColor(hex),
              ]}
            />
          ))}
        </div>
      ) : null}
      {tool === "bg-remove" ? (
        <label css={[typeRole.label, styles.colorLabel]}>
          <span>{t({ en: "Tolerance", zh: "容差" })}</span>
          <input
            type="range"
            min={0}
            max={128}
            value={tolerance}
            onChange={(event) => {
              onToleranceChange(Number(event.target.value));
            }}
            css={[a11y.focusRing, styles.range]}
            data-testid="tolerance"
          />
          <span
            css={[
              typeRole.bodySmall,
              typeModifier.numeric,
              styles.toleranceValue,
            ]}
          >
            {tolerance}
          </span>
        </label>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  colorRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
    backgroundColor: color.bgSurface,
    border: `${border.size_1} solid ${color.border}`,
  },
  colorLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.tight,
    color: color.fgMuted,
  },
  colorInput: {
    width: "32px",
    height: "32px",
    padding: 0,
    border: `${border.size_1} solid ${color.border}`,
    backgroundColor: "transparent",
    cursor: "pointer",
  },
  swatches: {
    display: "flex",
    gap: rhythm.inline,
  },
  swatch: {
    width: "24px",
    height: "24px",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "4px",
    cornerShape: "squircle",
  },
  swatchActive: {
    outlineColor: color.borderAccent,
    outlineOffset: border.size_1,
  },
  swatchColor: (backgroundColor: string) => ({
    backgroundColor,
  }),
  range: {
    accentColor: color.bgAccent,
    cursor: "pointer",
  },
  toleranceValue: {
    minWidth: "2.5em",
    textAlign: "right",
    fontFamily: font.familyMono,
    color: color.fg,
  },
});
