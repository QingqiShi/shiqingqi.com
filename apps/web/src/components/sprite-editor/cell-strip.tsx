"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { CellPixels } from "./types";

interface CellStripProps {
  cells: readonly (CellPixels | null)[];
  selectedCell: number | null;
  onSelect: (index: number) => void;
}

export function CellStrip({ cells, selectedCell, onSelect }: CellStripProps) {
  const cellLabel = t({ en: "Cell", zh: "单元格" });
  return (
    <div css={styles.root}>
      <h2 css={styles.heading}>
        {t({ en: "Cells", zh: "单元格" })}{" "}
        <span css={styles.count}>({cells.length})</span>
      </h2>
      <ol css={styles.list}>
        {cells.map((cell, index) => (
          <li
            // eslint-disable-next-line @eslint-react/no-array-index-key -- cells are positional; index IS the identity
            key={index}
            css={styles.item}
          >
            <button
              type="button"
              css={[
                styles.thumbButton,
                selectedCell === index && styles.thumbButtonActive,
              ]}
              onClick={() => {
                onSelect(index);
              }}
              data-testid={`cell-thumb-${String(index)}`}
              aria-label={`${cellLabel} ${String(index + 1)}`}
              aria-pressed={selectedCell === index}
            >
              <CellThumbnail cell={cell} />
              <span css={styles.thumbIndex}>{index + 1}</span>
            </button>
          </li>
        ))}
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
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${String(size)}px`;
    canvas.style.height = `${String(size)}px`;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (cell === null) return;
    ctx.imageSmoothingEnabled = false;
    // Integer-scale the cell pixels into the thumbnail and center — this
    // avoids the fractional-pixel artifacts you get with CSS-stretching a
    // small backing buffer up to the thumbnail size.
    const fit = Math.min(size / cell.width, size / cell.height);
    const scale = Math.max(1, Math.floor(fit));
    const drawnW = cell.width * scale;
    const drawnH = cell.height * scale;
    const dx = Math.floor((size - drawnW) / 2);
    const dy = Math.floor((size - drawnH) / 2);
    const imageData = new ImageData(cell.data, cell.width, cell.height);
    const off =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(cell.width, cell.height)
        : null;
    if (off !== null) {
      const offCtx = off.getContext("2d");
      if (offCtx !== null) {
        offCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(off, dx, dy, drawnW, drawnH);
      }
    } else {
      ctx.putImageData(imageData, dx, dy);
    }
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
    gap: space._2,
    padding: space._3,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
  },
  heading: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: ".05em",
  },
  count: {
    fontWeight: font.weight_4,
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
    gap: space._2,
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
    padding: 0,
    backgroundColor: color.backgroundMain,
    border: `2px solid ${color.border}`,
    borderRadius: border.radius_2,
    cursor: "pointer",
    overflow: "hidden",
    display: "block",
  },
  thumbButtonActive: {
    borderColor: color.brandPixelCreatureCreator,
  },
  thumbWrapper: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    backgroundColor: color.backgroundMain,
    backgroundImage: `linear-gradient(45deg, ${color.border} 25%, transparent 25%), linear-gradient(-45deg, ${color.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.border} 75%), linear-gradient(-45deg, transparent 75%, ${color.border} 75%)`,
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
    fontSize: font.uiBodySmall,
    color: color.textMain,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingInline: "4px",
    borderRadius: "4px",
    pointerEvents: "none",
  },
});
