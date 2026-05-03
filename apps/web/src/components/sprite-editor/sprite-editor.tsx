"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { FilmStripIcon } from "@phosphor-icons/react/dist/ssr/FilmStrip";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useMemo, useState } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { Button } from "#src/components/shared/button.tsx";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { AnimationFrame } from "./animation-mode";
import { AnimationMode } from "./animation-mode";
import { CellStrip } from "./cell-strip";
import { GridControls } from "./grid-controls";
import { GuideControls } from "./guide-controls";
import { OnionSkinPicker } from "./onion-skin-picker";
import { PixelEditor } from "./pixel-editor";
import { SourceCanvas } from "./source-canvas";
import { SourceImageInput } from "./source-image-input";
import type {
  CellPixels,
  GridConfig,
  OutputConfig,
  SourceImage,
} from "./types";
import type { GuideOptions } from "./utils/guides";
import { computeGuideFractions, DEFAULT_GUIDES } from "./utils/guides";
import { downloadBlob, pixelsToPng, sliceCell } from "./utils/slice";

const DEFAULT_GRID: GridConfig = {
  cols: 4,
  rows: 4,
  offsetX: 0,
  offsetY: 0,
  cellWidth: 313,
  cellHeight: 313,
  gapX: 0,
  gapY: 0,
};

const DEFAULT_OUTPUT: OutputConfig = { width: 42, height: 42 };

function basenameFor(source: SourceImage): string {
  return source.name.replace(/\.[^.]+$/, "") || "sprite";
}

type Mode = "slice" | "edit" | "animation";

export function SpriteEditor() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [grid, setGrid] = useState<GridConfig>(DEFAULT_GRID);
  const [output, setOutput] = useState<OutputConfig>(DEFAULT_OUTPUT);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("slice");
  // User edits — keyed by cell index. Cleared on grid/output change.
  const [edits, setEdits] = useState<Record<number, CellPixels>>({});
  const [guides, setGuides] = useState<GuideOptions>(DEFAULT_GUIDES);
  const [onionSourceCell, setOnionSourceCell] = useState<number | null>(null);
  const [animationFrames, setAnimationFrames] = useState<
    readonly AnimationFrame[]
  >([]);

  const baseCells = useMemo<readonly (CellPixels | null)[]>(() => {
    if (source === null) return [];
    const total = grid.cols * grid.rows;
    const result: (CellPixels | null)[] = [];
    for (let i = 0; i < total; i++) {
      const col = i % grid.cols;
      const row = Math.floor(i / grid.cols);
      result.push(sliceCell(source.bitmap, grid, output, col, row));
    }
    return result;
  }, [source, grid, output]);

  // Edited > base for display + download.
  const cells = useMemo<readonly (CellPixels | null)[]>(
    () => baseCells.map((base, index) => edits[index] ?? base),
    [baseCells, edits],
  );

  // Drop derived state whenever the grid/output shape changes — the cell
  // bytes no longer match the new shape, so silently keeping them would
  // corrupt output. Implemented via the "store previous deps in state"
  // pattern so React handles the reset during the same render that detects
  // the change (the alternative — useEffect with setState — wastes a render
  // and trips the react-hooks/set-state-in-effect rule).
  const shapeKey = `${String(grid.cols)}x${String(grid.rows)}@${String(output.width)}x${String(output.height)}`;
  const [prevShapeKey, setPrevShapeKey] = useState(shapeKey);
  if (prevShapeKey !== shapeKey) {
    setPrevShapeKey(shapeKey);
    setEdits({});
    setOnionSourceCell(null);
    setAnimationFrames([]);
  }

  // Auto-fit grid + reset selection when the source image changes.
  const [prevSource, setPrevSource] = useState(source);
  if (prevSource !== source) {
    setPrevSource(source);
    if (source !== null) {
      const fitsCurrent =
        grid.offsetX +
          grid.cols * grid.cellWidth +
          (grid.cols - 1) * grid.gapX <=
          source.width &&
        grid.offsetY +
          grid.rows * grid.cellHeight +
          (grid.rows - 1) * grid.gapY <=
          source.height;
      if (!fitsCurrent) {
        const cols = grid.cols || 1;
        const rows = grid.rows || 1;
        setGrid({
          cols,
          rows,
          offsetX: 0,
          offsetY: 0,
          cellWidth: Math.max(1, Math.floor(source.width / cols)),
          cellHeight: Math.max(1, Math.floor(source.height / rows)),
          gapX: 0,
          gapY: 0,
        });
      }
    }
    setSelectedCell(null);
    setMode("slice");
    setEdits({});
  }

  const commitEdit = useCallback((cellIndex: number, next: CellPixels) => {
    setEdits((current) => ({ ...current, [cellIndex]: next }));
  }, []);

  const revertEdit = useCallback((cellIndex: number) => {
    setEdits((current) => {
      if (!(cellIndex in current)) return current;
      // Drop the entry without `delete` so eslint's no-dynamic-delete passes.
      const { [cellIndex]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const handleDownloadCell = async (index: number) => {
    if (source === null) return;
    const cell = cells[index];
    if (cell === null) return;
    const blob = await pixelsToPng(cell);
    if (blob === null) return;
    downloadBlob(
      blob,
      `${basenameFor(source)}-cell-${String(index + 1).padStart(2, "0")}.png`,
    );
  };

  const handleDownloadAll = async () => {
    if (source === null) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell === null) continue;
      const blob = await pixelsToPng(cell);
      if (blob === null) continue;
      downloadBlob(
        blob,
        `${basenameFor(source)}-cell-${String(i + 1).padStart(2, "0")}.png`,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  const selectedBaseCell =
    selectedCell !== null ? (baseCells[selectedCell] ?? null) : null;
  const selectedEdit =
    selectedCell !== null ? (edits[selectedCell] ?? null) : null;

  // Stable callbacks for the pixel editor. Otherwise its sync effect re-fires
  // every render of this parent, looping with `setEdits`.
  const handleEditorCommit = useCallback(
    (next: CellPixels) => {
      if (selectedCell === null) return;
      commitEdit(selectedCell, next);
    },
    [commitEdit, selectedCell],
  );
  const handleEditorRevert = useCallback(() => {
    if (selectedCell === null) return;
    revertEdit(selectedCell);
  }, [revertEdit, selectedCell]);

  // Draw sub-cell guides on the source canvas — same fractional positions
  // applied within every grid cell so users can sanity-check alignment of
  // baselines, eyelines, etc. across all cells of the sheet at once.
  const drawSourceGuides = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      pixelToCanvas: (x: number, y: number) => readonly [number, number],
    ) => {
      const fractions = computeGuideFractions(guides);
      if (
        fractions.vertical.length === 0 &&
        fractions.horizontal.length === 0
      ) {
        return;
      }
      ctx.save();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const pitchX = grid.cellWidth + grid.gapX;
      const pitchY = grid.cellHeight + grid.gapY;
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const x0 = grid.offsetX + col * pitchX;
          const y0 = grid.offsetY + row * pitchY;
          for (const fx of fractions.vertical) {
            const px = x0 + fx * grid.cellWidth;
            const [a, b] = pixelToCanvas(px, y0);
            const [, d] = pixelToCanvas(px, y0 + grid.cellHeight);
            ctx.moveTo(Math.round(a) + 0.5, b);
            ctx.lineTo(Math.round(a) + 0.5, d);
          }
          for (const fy of fractions.horizontal) {
            const py = y0 + fy * grid.cellHeight;
            const [a, b] = pixelToCanvas(x0, py);
            const [c] = pixelToCanvas(x0 + grid.cellWidth, py);
            ctx.moveTo(a, Math.round(b) + 0.5);
            ctx.lineTo(c, Math.round(b) + 0.5);
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
    [grid, guides],
  );

  const onionCell =
    onionSourceCell !== null && onionSourceCell !== selectedCell
      ? (cells[onionSourceCell] ?? null)
      : null;

  return (
    <div css={styles.root}>
      <div css={styles.sidebar}>
        <SourceImageInput source={source} onSourceChange={setSource} />
        {source !== null ? (
          <>
            <GridControls
              source={source}
              grid={grid}
              onGridChange={setGrid}
              output={output}
              onOutputChange={setOutput}
            />
            <GuideControls guides={guides} onGuidesChange={setGuides} />
            <div css={styles.actions}>
              <Button
                icon={
                  <DownloadSimpleIcon
                    size={16}
                    weight="bold"
                    aria-hidden="true"
                  />
                }
                onClick={() => {
                  if (selectedCell === null) return;
                  void handleDownloadCell(selectedCell);
                }}
                disabled={selectedCell === null}
                data-testid="download-selected"
              >
                {t({ en: "Download selected", zh: "下载选中" })}
              </Button>
              <Button
                icon={
                  <DownloadSimpleIcon
                    size={16}
                    weight="bold"
                    aria-hidden="true"
                  />
                }
                onClick={() => {
                  void handleDownloadAll();
                }}
                disabled={cells.length === 0}
                data-testid="download-all"
              >
                {t({ en: "Download all", zh: "全部下载" })}
              </Button>
              <Button
                icon={
                  <PencilSimpleIcon
                    size={16}
                    weight="bold"
                    aria-hidden="true"
                  />
                }
                isActive={mode === "edit"}
                onClick={() => {
                  setMode((current) => (current === "edit" ? "slice" : "edit"));
                }}
                disabled={selectedCell === null}
                data-testid="toggle-edit"
              >
                {mode === "edit"
                  ? t({ en: "Back to slice view", zh: "返回切片视图" })
                  : t({ en: "Edit selected cell", zh: "编辑选中" })}
              </Button>
              <Button
                icon={
                  <FilmStripIcon size={16} weight="bold" aria-hidden="true" />
                }
                isActive={mode === "animation"}
                onClick={() => {
                  setMode((current) =>
                    current === "animation" ? "slice" : "animation",
                  );
                }}
                data-testid="toggle-animation"
              >
                {mode === "animation"
                  ? t({ en: "Back to slice view", zh: "返回切片视图" })
                  : t({ en: "Animation", zh: "动画" })}
              </Button>
            </div>
            <CellStrip
              cells={cells}
              selectedCell={selectedCell}
              onSelect={setSelectedCell}
            />
          </>
        ) : null}
      </div>

      <div css={styles.canvasArea}>
        {source === null ? (
          <div css={styles.empty}>
            <p>
              {t({
                en: "Choose a source image to start slicing.",
                zh: "选择源图开始切分。",
              })}
            </p>
          </div>
        ) : mode === "animation" ? (
          <AnimationMode
            cells={cells}
            frames={animationFrames}
            onFramesChange={setAnimationFrames}
            selectedCell={selectedCell}
            baseFilename={basenameFor(source)}
          />
        ) : mode === "edit" &&
          selectedCell !== null &&
          selectedBaseCell !== null ? (
          <div css={styles.editorWrap}>
            <div css={styles.editorHeader}>
              <Button
                icon={
                  <ArrowLeftIcon size={16} weight="bold" aria-hidden="true" />
                }
                onClick={() => {
                  setMode("slice");
                }}
                data-testid="back-to-slice"
              >
                {t({ en: "Back", zh: "返回" })}
              </Button>
              <span css={styles.editorTitle}>
                {t({ en: "Editing cell", zh: "编辑单元格" })} {selectedCell + 1}
              </span>
            </div>
            <OnionSkinPicker
              cells={cells}
              currentCell={selectedCell}
              onionSourceCell={onionSourceCell}
              onChange={setOnionSourceCell}
            />
            <PixelEditor
              key={selectedCell}
              baseCell={selectedBaseCell}
              savedEdit={selectedEdit}
              onCommit={handleEditorCommit}
              onRevert={handleEditorRevert}
              guides={guides}
              onionCell={onionCell}
            />
          </div>
        ) : (
          <SourceCanvas
            source={source}
            grid={grid}
            selectedCell={selectedCell}
            onCellSelect={setSelectedCell}
            drawOverlay={drawSourceGuides}
          />
        )}
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gap: space._3,
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "320px 1fr" },
    gridTemplateRows: { default: "auto 1fr", [breakpoints.md]: "1fr" },
    height: { default: "auto", [breakpoints.md]: "calc(100dvh - 96px)" },
    maxInlineSize: "1400px",
    width: "100%",
    marginInline: "auto",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    overflowY: { default: "visible", [breakpoints.md]: "auto" },
    paddingInlineEnd: { default: 0, [breakpoints.md]: space._1 },
  },
  canvasArea: {
    display: "flex",
    flexDirection: "column",
    minHeight: "320px",
    height: { default: "60dvh", [breakpoints.md]: "100%" },
  },
  empty: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    height: "100%",
    color: color.textMuted,
    fontSize: font.uiBody,
    border: `1px dashed ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
  },
  actions: {
    display: "flex",
    gap: space._2,
    flexWrap: "wrap",
  },
  editorWrap: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    width: "100%",
    height: "100%",
    minHeight: 0,
  },
  editorHeader: {
    display: "flex",
    alignItems: "center",
    gap: space._3,
  },
  editorTitle: {
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
});
