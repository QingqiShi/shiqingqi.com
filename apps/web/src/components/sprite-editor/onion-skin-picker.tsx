"use client";

import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { CellPixels } from "./types";

interface OnionSkinPickerProps {
  cells: readonly (CellPixels | null)[];
  /** The cell currently being edited — excluded from the onion options. */
  currentCell: number;
  /** Selected onion source, or null when off. */
  onionSourceCell: number | null;
  onChange: (next: number | null) => void;
}

export function OnionSkinPicker({
  cells,
  currentCell,
  onionSourceCell,
  onChange,
}: OnionSkinPickerProps) {
  const id = useId();
  const cellLabel = t({ en: "Cell", zh: "单元格" });
  return (
    <div css={styles.root}>
      <label htmlFor={id} css={styles.label}>
        {t({ en: "Onion skin", zh: "洋葱皮" })}
      </label>
      <select
        id={id}
        css={styles.select}
        value={onionSourceCell ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "") {
            onChange(null);
            return;
          }
          onChange(Number(value));
        }}
        data-testid="onion-source"
      >
        <option value="">{t({ en: "Off", zh: "关闭" })}</option>
        {cells.map((cell, index) => {
          if (index === currentCell) return null;
          if (cell === null) return null;
          return (
            <option
              // eslint-disable-next-line @eslint-react/no-array-index-key -- cells are positional; index IS the identity
              key={index}
              value={index}
            >
              {cellLabel} {index + 1}
            </option>
          );
        })}
      </select>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._2,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    backgroundColor: color.backgroundRaised,
    fontSize: font.uiBodySmall,
  },
  label: {
    color: color.textMuted,
  },
  select: {
    backgroundColor: color.backgroundMain,
    color: color.textMain,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    paddingBlock: space._1,
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
    fontFamily: "inherit",
  },
});
