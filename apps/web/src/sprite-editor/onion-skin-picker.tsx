"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
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
    <div css={[typeRole.bodySmall, corner.radius_2, styles.root]}>
      <label htmlFor={id} css={styles.label}>
        {t({ en: "Onion skin", zh: "洋葱皮" })}
      </label>
      <select
        id={id}
        css={[
          typeRole.bodySmall,
          corner.radius_2,
          a11y.focusRing,
          styles.select,
        ]}
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
              // cells are positional; index IS the identity
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
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._2,
    border: `${border.size_1} solid ${color.border}`,
    backgroundColor: color.bgSurface,
  },
  label: {
    color: color.fgMuted,
  },
  select: {
    backgroundColor: color.bgSurfaceSunken,
    color: color.fg,
    border: `${border.size_1} solid ${color.border}`,
    paddingBlock: space._1,
    paddingInline: space._2,
    fontFamily: "inherit",
  },
});
