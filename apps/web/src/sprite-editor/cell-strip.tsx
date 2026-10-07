"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole, typeModifier } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { drawCellCentered } from "./draw-cell-centered";
import { prepareCanvas } from "./prepare-canvas";
import type { CellPixels } from "./types";

interface CellStripProps {
  cells: readonly (CellPixels | null)[];
  selectedCell: number | null;
  onSelect: (index: number) => void;
}

export function CellStrip({ cells, selectedCell, onSelect }: CellStripProps) {
  const cellLabel = t({ en: "Cell", zh: "单元格" });
  const headingId = useId();
  // The radio-group hook is generic over `string`, so convert at the
  // boundary. Stringified indices are stable identifiers since cells are
  // positional.
  const values = useMemo(() => cells.map((_, index) => String(index)), [cells]);
  // When nothing is selected yet, point `value` at the first cell so the
  // group still has exactly one tab stop (canonical radiogroup-with-no-
  // default pattern). We override `aria-checked` below to stay honest about
  // selection state.
  const value = selectedCell === null ? "0" : String(selectedCell);
  const { getOptionProps } = useRadioGroup({
    values,
    value,
    onChange: (next) => {
      onSelect(Number(next));
    },
  });

  return (
    <div css={[corner.radius_3, styles.root]}>
      <h2 css={[typeRole.label, styles.heading]} id={headingId}>
        {t({ en: "Cells", zh: "单元格" })}{" "}
        <span css={[typeModifier.numeric, styles.count]}>({cells.length})</span>
      </h2>
      <ol css={styles.list} role="radiogroup" aria-labelledby={headingId}>
        {cells.map((cell, index) => {
          const isSelected = selectedCell === index;
          return (
            <li
              // cells are positional; index IS the identity
              key={index}
              css={styles.item}
            >
              <button
                type="button"
                {...getOptionProps(String(index))}
                // Override `aria-checked` from the hook: when nothing is
                // selected the hook would mark cell 0 as checked because
                // `value` is "0" to seed the tab stop. We need it to read
                // as unchecked until the user actually picks a cell.
                aria-checked={isSelected}
                css={[
                  buttonReset.base,
                  corner.radius_2,
                  styles.thumbButton,
                  isSelected && styles.thumbButtonActive,
                ]}
                data-testid={`cell-thumb-${String(index)}`}
                aria-label={`${cellLabel} ${String(index + 1)}`}
              >
                <CellThumbnail cell={cell} />
                <span css={[typeRole.bodySmall, styles.thumbIndex]}>
                  {index + 1}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface CellThumbnailProps {
  cell: CellPixels | null;
}

function CellThumbnail({ cell }: CellThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const next = Math.min(entry.contentRect.width, entry.contentRect.height);
      setSize(next);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || size === 0) return;
    const ctx = prepareCanvas(canvas, size, size);
    if (ctx === null || cell === null) return;
    drawCellCentered(ctx, cell, size);
  }, [cell, size]);

  return (
    <div ref={wrapperRef} css={styles.thumbWrapper}>
      <canvas ref={canvasRef} css={styles.thumb} aria-hidden="true" />
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    padding: space._4,
    border: `${border.size_1} solid ${color.border}`,
    backgroundColor: color.bgSurface,
    flexShrink: 0,
  },
  heading: {
    margin: 0,
    color: color.fg,
    fontWeight: font.weight_6,
  },
  count: {
    color: color.fgMuted,
    fontWeight: font.weight_4,
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
    gap: rhythm.tight,
    margin: 0,
    padding: 0,
    listStyle: "none",
    maxHeight: "260px",
    overflowY: "auto",
  },
  item: {
    margin: 0,
  },
  thumbButton: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    backgroundColor: color.bgCanvas,
    borderWidth: border.size_2,
    borderStyle: "solid",
    overflow: "hidden",
    display: "block",
    borderColor: {
      default: color.border,
      ":hover": {
        default: null,
        [pointer.canHover]: color.borderAccent,
      },
    },
    transition: {
      default: `border-color ${duration._150} ${easing.easeOut}, box-shadow ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  thumbButtonActive: {
    borderColor: color.borderAccent,
    boxShadow: `0 0 0 2px color-mix(in srgb, ${color.borderAccent} 20%, transparent)`,
  },
  thumbWrapper: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    backgroundColor: color.bgCanvas,
    backgroundImage: `linear-gradient(45deg, ${color.bgNeutralSubtle} 25%, transparent 25%), linear-gradient(-45deg, ${color.bgNeutralSubtle} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.bgNeutralSubtle} 75%), linear-gradient(-45deg, transparent 75%, ${color.bgNeutralSubtle} 75%)`,
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
  },
  thumb: {
    display: "block",
    imageRendering: "pixelated",
  },
  thumbIndex: {
    position: "absolute",
    insetBlockEnd: "2px",
    insetInlineEnd: "4px",
    color: color.fgOnScrim,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingInline: "4px",
    borderRadius: "4px",
    cornerShape: "squircle",
    pointerEvents: "none",
  },
});
