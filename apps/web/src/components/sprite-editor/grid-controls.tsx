"use client";

import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
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
  emphasis?: boolean;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  testId,
  emphasis = false,
}: NumberFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} css={styles.field}>
      <span css={[styles.fieldLabel, emphasis && styles.fieldLabelEmphasis]}>
        {label}
      </span>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        css={[styles.input, emphasis && styles.inputEmphasis]}
        onChange={(event) => {
          // Skip mid-edit blank state — `Number("")` is 0, which would
          // commit a destructive 0 (or 1, after the callsite's clamp) and
          // overwrite the digit the user is about to type. The browser
          // keeps the field visually empty until the user blurs or types.
          if (event.target.value === "") return;
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
      <section css={styles.group}>
        <h3 css={styles.sectionLabel}>{t({ en: "Grid", zh: "网格" })}</h3>
        <div css={styles.primaryRow}>
          <NumberField
            label={t({ en: "Columns", zh: "列数" })}
            value={grid.cols}
            min={1}
            max={64}
            onChange={(cols) => {
              updateColsRows(Math.max(1, cols), grid.rows);
            }}
            testId="grid-cols"
            emphasis
          />
          <span css={styles.times} aria-hidden="true">
            ×
          </span>
          <NumberField
            label={t({ en: "Rows", zh: "行数" })}
            value={grid.rows}
            min={1}
            max={64}
            onChange={(rows) => {
              updateColsRows(grid.cols, Math.max(1, rows));
            }}
            testId="grid-rows"
            emphasis
          />
        </div>

        <p css={styles.subLabel}>
          {t({ en: "Alignment & gaps", zh: "对齐与间距" })}
        </p>
        <div css={styles.fieldGrid}>
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
        </div>
      </section>

      <div css={styles.divider} aria-hidden="true" />

      <section css={styles.group}>
        <h3 css={styles.sectionLabel}>
          {t({ en: "Output size", zh: "输出尺寸" })}
        </h3>
        <div css={styles.fieldGrid}>
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
        </div>
      </section>
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
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    margin: 0,
    padding: 0,
    border: "none",
  },
  sectionLabel: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingSnug,
    color: color.textMain,
  },
  divider: {
    height: "1px",
    backgroundColor: color.neutralBorder,
  },
  primaryRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "end",
    gap: space._2,
  },
  times: {
    paddingBlockEnd: space._2,
    fontSize: font.uiHeading3,
    fontWeight: font.weight_4,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  subLabel: {
    margin: 0,
    marginBlockStart: space._1,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textSubtle,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space._2,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_5,
    color: color.textMuted,
  },
  fieldLabelEmphasis: {
    fontSize: font.uiBodySmall,
    color: color.textMain,
  },
  input: {
    width: "100%",
    paddingBlock: space._1,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceSunken,
    color: color.textMain,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_2,
    fontSize: font.uiBodySmall,
    fontFamily: font.familyMono,
    fontVariantNumeric: "tabular-nums",
    boxSizing: "border-box",
    outlineWidth: 0,
    transition: {
      default: `border-color ${duration._150} ${easing.easeOut}, box-shadow ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    borderColor: {
      default: color.neutralBorder,
      ":focus": color.accent,
    },
    boxShadow: {
      default: "none",
      ":focus": `0 0 0 1px ${color.accent}`,
    },
  },
  inputEmphasis: {
    paddingBlock: space._2,
    fontSize: font.uiHeading3,
    fontWeight: font.weight_6,
    textAlign: "center",
  },
});
