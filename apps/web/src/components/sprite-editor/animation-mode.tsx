"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { PauseIcon } from "@phosphor-icons/react/dist/ssr/Pause";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#src/components/shared/button.tsx";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { CellPixels } from "./types";
import { downloadBlob } from "./utils/slice";
import { exportSpriteSheet } from "./utils/sprite-sheet";

export interface AnimationFrame {
  cellIndex: number;
  duration: number;
}

interface AnimationModeProps {
  cells: readonly (CellPixels | null)[];
  frames: readonly AnimationFrame[];
  onFramesChange: (next: readonly AnimationFrame[]) => void;
  /** Cell currently selected in the editor — used for "Add frame". */
  selectedCell: number | null;
  /** Filename stub for downloaded artifacts. */
  baseFilename: string;
}

const DEFAULT_DURATION = 120;
const PREVIEW_SIZE = 240;
const FRAME_THUMB_SIZE = 48;

export function AnimationMode({
  cells,
  frames,
  onFramesChange,
  selectedCell,
  baseFilename,
}: AnimationModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeFrame, setActiveFrame] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Reset/clamp the active frame whenever the frame count drops. Stored
  // as a render-time check rather than a useEffect so React handles the
  // reset in the same render that detects the change (avoids the
  // react-hooks/set-state-in-effect cascade).
  const [prevFrameCount, setPrevFrameCount] = useState(frames.length);
  if (prevFrameCount !== frames.length) {
    setPrevFrameCount(frames.length);
    if (frames.length === 0) {
      setActiveFrame(0);
      setIsPlaying(false);
    } else if (activeFrame >= frames.length) {
      setActiveFrame(0);
    }
  }

  // Playback loop. Uses real time + frame durations, scaled by `speed`, so
  // setting `speed = 2` halves each duration and `speed = 0.5` doubles it.
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    let raf = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      elapsed += (now - lastTime) * speed;
      lastTime = now;
      let idx = activeFrame;
      while (elapsed >= frames[idx].duration) {
        elapsed -= frames[idx].duration;
        idx = (idx + 1) % frames.length;
      }
      if (idx !== activeFrame) {
        setActiveFrame(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [isPlaying, speed, frames, activeFrame]);

  // Render the current frame to the preview canvas at integer scale, centered.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas === null) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
    const cssSize = PREVIEW_SIZE;
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height = Math.floor(cssSize * dpr);
    canvas.style.width = `${String(cssSize)}px`;
    canvas.style.height = `${String(cssSize)}px`;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);
    if (frames.length === 0) return;
    const frame = frames[activeFrame];
    const cell = cells[frame.cellIndex];
    if (cell === null) return;
    ctx.imageSmoothingEnabled = false;
    const fit = Math.min(cssSize / cell.width, cssSize / cell.height);
    const scale = Math.max(1, Math.floor(fit));
    const drawnW = cell.width * scale;
    const drawnH = cell.height * scale;
    const dx = Math.floor((cssSize - drawnW) / 2);
    const dy = Math.floor((cssSize - drawnH) / 2);
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
  }, [frames, activeFrame, cells]);

  const addCurrentFrame = () => {
    if (selectedCell === null) return;
    const cell = cells[selectedCell];
    if (cell === null) return;
    onFramesChange([
      ...frames,
      { cellIndex: selectedCell, duration: DEFAULT_DURATION },
    ]);
  };

  const removeFrame = (index: number) => {
    onFramesChange(frames.filter((_, i) => i !== index));
  };

  const moveFrame = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= frames.length) return;
    const next = frames.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onFramesChange(next);
  };

  const setFrameDuration = (index: number, duration: number) => {
    onFramesChange(
      frames.map((f, i) =>
        i === index ? { ...f, duration: Math.max(1, duration) } : f,
      ),
    );
  };

  const cellLabel = t({ en: "Cell", zh: "单元格" });
  const msLabel = t({ en: "ms", zh: "毫秒" });
  const moveUpLabel = t({ en: "Move up", zh: "上移" });
  const moveDownLabel = t({ en: "Move down", zh: "下移" });
  const removeLabel = t({ en: "Remove frame", zh: "删除帧" });

  const handleExport = useCallback(async () => {
    const cellPayload: { cell: CellPixels; duration: number }[] = [];
    for (const frame of frames) {
      const cell = cells[frame.cellIndex];
      if (cell === null) continue;
      cellPayload.push({ cell, duration: frame.duration });
    }
    if (cellPayload.length === 0) return;
    const result = await exportSpriteSheet(cellPayload);
    if (result === null) return;
    downloadBlob(result.png, `${baseFilename}-sheet.png`);
    const manifestBlob = new Blob([JSON.stringify(result.manifest, null, 2)], {
      type: "application/json",
    });
    downloadBlob(manifestBlob, `${baseFilename}-sheet.json`);
  }, [baseFilename, cells, frames]);

  return (
    <div css={styles.root}>
      <div css={styles.previewArea}>
        <canvas
          ref={previewCanvasRef}
          css={styles.previewCanvas}
          data-testid="animation-preview"
        />
        <div css={styles.previewControls}>
          <Button
            icon={
              isPlaying ? (
                <PauseIcon size={16} weight="bold" aria-hidden="true" />
              ) : (
                <PlayIcon size={16} weight="bold" aria-hidden="true" />
              )
            }
            onClick={() => {
              setIsPlaying((value) => !value);
            }}
            disabled={frames.length === 0}
            data-testid="play-pause"
          >
            {isPlaying
              ? t({ en: "Pause", zh: "暂停" })
              : t({ en: "Play", zh: "播放" })}
          </Button>
          <label css={styles.speedLabel}>
            <span>{t({ en: "Speed", zh: "速度" })}</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={speed}
              onChange={(event) => {
                setSpeed(Number(event.target.value));
              }}
              data-testid="speed"
            />
            <span css={styles.speedValue}>{speed.toFixed(2)}×</span>
          </label>
          <Button
            icon={
              <DownloadSimpleIcon size={16} weight="bold" aria-hidden="true" />
            }
            onClick={() => {
              void handleExport();
            }}
            disabled={frames.length === 0}
            data-testid="export-sheet"
          >
            {t({ en: "Export sprite sheet", zh: "导出精灵表" })}
          </Button>
        </div>
      </div>

      <div css={styles.timelineArea}>
        <div css={styles.timelineHeader}>
          <h2 css={styles.timelineTitle}>
            {t({ en: "Frames", zh: "帧" })}{" "}
            <span css={styles.timelineCount}>({frames.length})</span>
          </h2>
          <Button
            icon={<PlusIcon size={16} weight="bold" aria-hidden="true" />}
            onClick={addCurrentFrame}
            disabled={selectedCell === null}
            data-testid="add-frame"
          >
            {t({ en: "Add current cell", zh: "添加当前单元格" })}
          </Button>
        </div>
        {frames.length === 0 ? (
          <p css={styles.empty}>
            {t({
              en: "Select a cell in the strip and click Add to build an animation.",
              zh: "在单元格列表中选一个，点添加来构建动画。",
            })}
          </p>
        ) : (
          <ol css={styles.frameList}>
            {frames.map((frame, index) => (
              <li
                // eslint-disable-next-line @eslint-react/no-array-index-key -- frames are positional; index IS the identity
                key={index}
                css={[
                  styles.frameItem,
                  activeFrame === index && styles.frameItemActive,
                ]}
              >
                <FrameThumb cell={cells[frame.cellIndex] ?? null} />
                <div css={styles.frameMeta}>
                  <span css={styles.frameLabel}>
                    {cellLabel} {frame.cellIndex + 1}
                  </span>
                  <label css={styles.frameDurationLabel}>
                    <span>{msLabel}</span>
                    <input
                      type="number"
                      min={1}
                      step={10}
                      value={frame.duration}
                      onChange={(event) => {
                        setFrameDuration(index, Number(event.target.value));
                      }}
                      css={styles.frameDuration}
                      data-testid={`frame-duration-${String(index)}`}
                    />
                  </label>
                </div>
                <div css={styles.frameActions}>
                  <button
                    type="button"
                    css={styles.iconButton}
                    onClick={() => {
                      moveFrame(index, -1);
                    }}
                    disabled={index === 0}
                    aria-label={moveUpLabel}
                  >
                    <ArrowUpIcon size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    css={styles.iconButton}
                    onClick={() => {
                      moveFrame(index, 1);
                    }}
                    disabled={index === frames.length - 1}
                    aria-label={moveDownLabel}
                  >
                    <ArrowDownIcon size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    css={styles.iconButton}
                    onClick={() => {
                      removeFrame(index);
                    }}
                    aria-label={removeLabel}
                    data-testid={`remove-frame-${String(index)}`}
                  >
                    <TrashIcon size={14} weight="bold" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

interface FrameThumbProps {
  cell: CellPixels | null;
}

function FrameThumb({ cell }: FrameThumbProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
    canvas.width = Math.floor(FRAME_THUMB_SIZE * dpr);
    canvas.height = Math.floor(FRAME_THUMB_SIZE * dpr);
    canvas.style.width = `${String(FRAME_THUMB_SIZE)}px`;
    canvas.style.height = `${String(FRAME_THUMB_SIZE)}px`;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, FRAME_THUMB_SIZE, FRAME_THUMB_SIZE);
    if (cell === null) return;
    ctx.imageSmoothingEnabled = false;
    const fit = Math.min(
      FRAME_THUMB_SIZE / cell.width,
      FRAME_THUMB_SIZE / cell.height,
    );
    const scale = Math.max(1, Math.floor(fit));
    const drawnW = cell.width * scale;
    const drawnH = cell.height * scale;
    const dx = Math.floor((FRAME_THUMB_SIZE - drawnW) / 2);
    const dy = Math.floor((FRAME_THUMB_SIZE - drawnH) / 2);
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
  }, [cell]);
  return <canvas ref={ref} css={styles.thumb} aria-hidden="true" />;
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    width: "100%",
    height: "100%",
    minHeight: 0,
  },
  previewArea: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    padding: space._3,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
  },
  previewCanvas: {
    display: "block",
    backgroundColor: color.backgroundMain,
    backgroundImage: `linear-gradient(45deg, ${color.border} 25%, transparent 25%), linear-gradient(-45deg, ${color.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.border} 75%), linear-gradient(-45deg, transparent 75%, ${color.border} 75%)`,
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    imageRendering: "pixelated",
    alignSelf: "center",
  },
  previewControls: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
  },
  speedLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  speedValue: {
    minWidth: "3em",
    textAlign: "right",
    fontSize: font.uiBodySmall,
    color: color.textMain,
    fontVariantNumeric: "tabular-nums",
  },
  timelineArea: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    padding: space._3,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
    flex: "1",
    minHeight: 0,
    overflowY: "auto",
  },
  timelineHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  timelineTitle: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: ".05em",
  },
  timelineCount: {
    fontWeight: font.weight_4,
  },
  empty: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  frameList: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  frameItem: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    padding: space._2,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    backgroundColor: color.backgroundMain,
  },
  frameItemActive: {
    borderColor: color.brandPixelCreatureCreator,
  },
  thumb: {
    backgroundColor: color.backgroundMain,
    backgroundImage: `linear-gradient(45deg, ${color.border} 25%, transparent 25%), linear-gradient(-45deg, ${color.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.border} 75%), linear-gradient(-45deg, transparent 75%, ${color.border} 75%)`,
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
    borderRadius: border.radius_2,
    imageRendering: "pixelated",
  },
  frameMeta: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  frameLabel: {
    fontSize: font.uiBodySmall,
    color: color.textMain,
    fontWeight: font.weight_6,
  },
  frameDurationLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  frameDuration: {
    width: "5em",
    paddingBlock: "2px",
    paddingInline: space._1,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    backgroundColor: color.backgroundRaised,
    color: color.textMain,
    fontFamily: "inherit",
    fontSize: font.uiBodySmall,
  },
  frameActions: {
    display: "flex",
    gap: "2px",
  },
  iconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "26px",
    height: "26px",
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover:not(:disabled)": color.backgroundHover,
    },
    color: color.textMain,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.4 },
  },
});
