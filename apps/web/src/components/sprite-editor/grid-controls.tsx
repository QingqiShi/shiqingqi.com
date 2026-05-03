"use client";

import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { GridConfig, OutputConfig, SourceImage } from "./types";

interface GridControlsProps {
  source: SourceImage;
  grid: GridConfig;
  onGridChange: (next: GridConfig) => void;
  output: OutputConfig;
  onOutputChange: (next: OutputConfig) => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  testId?: string;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  testId,
}: NumberFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} css={styles.field}>
      <span css={styles.fieldLabel}>{label}</span>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        css={styles.input}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isNaN(next)) return;
          onChange(next);
        }}
        data-testid={testId}
      />
    </label>
  );
}

export function GridControls({
  source,
  grid,
  onGridChange,
  output,
  onOutputChange,
}: GridControlsProps) {
  // Helper: set rows/cols and auto-fit cell size to the remaining space so a
  // fresh import lands with sensible defaults. Gaps are preserved when
  // adjusting counts so the user's gap choice survives count changes.
  const updateColsRows = (cols: number, rows: number) => {
    const safeCols = Math.max(1, cols);
    const safeRows = Math.max(1, rows);
    const cellWidth = Math.max(
      1,
      Math.floor(
        (source.width - grid.offsetX - (safeCols - 1) * grid.gapX) / safeCols,
      ),
    );
    const cellHeight = Math.max(
      1,
      Math.floor(
        (source.height - grid.offsetY - (safeRows - 1) * grid.gapY) / safeRows,
      ),
    );
    onGridChange({ ...grid, cols, rows, cellWidth, cellHeight });
  };

  return (
    <div css={styles.root}>
      <fieldset css={styles.group}>
        <legend css={styles.legend}>{t({ en: "Grid", zh: "网格" })}</legend>
        <NumberField
          label={t({ en: "Columns", zh: "列数" })}
          value={grid.cols}
          min={1}
          max={64}
          onChange={(cols) => {
            updateColsRows(Math.max(1, cols), grid.rows);
          }}
          testId="grid-cols"
        />
        <NumberField
          label={t({ en: "Rows", zh: "行数" })}
          value={grid.rows}
          min={1}
          max={64}
          onChange={(rows) => {
            updateColsRows(grid.cols, Math.max(1, rows));
          }}
          testId="grid-rows"
        />
        <NumberField
          label={t({ en: "Offset X", zh: "X 偏移" })}
          value={grid.offsetX}
          min={0}
          max={source.width}
          onChange={(offsetX) => {
            onGridChange({ ...grid, offsetX });
          }}
          testId="grid-offset-x"
        />
        <NumberField
          label={t({ en: "Offset Y", zh: "Y 偏移" })}
          value={grid.offsetY}
          min={0}
          max={source.height}
          onChange={(offsetY) => {
            onGridChange({ ...grid, offsetY });
          }}
          testId="grid-offset-y"
        />
        <NumberField
          label={t({ en: "Cell W", zh: "格宽" })}
          value={grid.cellWidth}
          min={1}
          onChange={(cellWidth) => {
            onGridChange({ ...grid, cellWidth: Math.max(1, cellWidth) });
          }}
          testId="grid-cell-w"
        />
        <NumberField
          label={t({ en: "Cell H", zh: "格高" })}
          value={grid.cellHeight}
          min={1}
          onChange={(cellHeight) => {
            onGridChange({ ...grid, cellHeight: Math.max(1, cellHeight) });
          }}
          testId="grid-cell-h"
        />
        <NumberField
          label={t({ en: "Gap X", zh: "X 间距" })}
          value={grid.gapX}
          min={0}
          max={source.width}
          onChange={(gapX) => {
            onGridChange({ ...grid, gapX: Math.max(0, gapX) });
          }}
          testId="grid-gap-x"
        />
        <NumberField
          label={t({ en: "Gap Y", zh: "Y 间距" })}
          value={grid.gapY}
          min={0}
          max={source.height}
          onChange={(gapY) => {
            onGridChange({ ...grid, gapY: Math.max(0, gapY) });
          }}
          testId="grid-gap-y"
        />
      </fieldset>

      <fieldset css={styles.group}>
        <legend css={styles.legend}>
          {t({ en: "Output size", zh: "输出尺寸" })}
        </legend>
        <NumberField
          label={t({ en: "Width", zh: "宽" })}
          value={output.width}
          min={1}
          max={1024}
          onChange={(width) => {
            onOutputChange({ ...output, width: Math.max(1, width) });
          }}
          testId="output-width"
        />
        <NumberField
          label={t({ en: "Height", zh: "高" })}
          value={output.height}
          min={1}
          max={1024}
          onChange={(height) => {
            onOutputChange({ ...output, height: Math.max(1, height) });
          }}
          testId="output-height"
        />
      </fieldset>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  group: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space._2,
    padding: space._3,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
    margin: 0,
  },
  legend: {
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: ".05em",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  fieldLabel: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  input: {
    width: "100%",
    paddingBlock: space._1,
    paddingInline: space._2,
    backgroundColor: color.backgroundMain,
    color: color.textMain,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    fontSize: font.uiBody,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
});
