"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";
import type { DebugMode, DebugOptions, FrameStats, LoopControls } from "./loop";
import { init, start } from "./loop";
import displayFs from "./shaders/display-fs.glsl";
import pathtracerFs from "./shaders/pathtracer-fs.glsl";
import vs from "./shaders/vs.glsl";

function formatStats(stats: FrameStats) {
  const gpu =
    stats.frameGpu !== null ? `${stats.frameGpu.toFixed(2)} ms` : "n/a";
  return [
    `FPS: ${stats.fps}`,
    `CPU: ${stats.frameCpu.toFixed(2)} ms`,
    `GPU: ${gpu}`,
    `Samples/px: ${stats.samplesPerPixel}`,
    `Draw calls: ${stats.drawCalls}`,
    `Resolution: ${stats.resolution[0]}×${stats.resolution[1]}`,
  ].join("\n");
}

const DEBUG_MODES: { value: DebugMode; label: string }[] = [
  { value: "normal", label: "Render" },
  { value: "heatmap", label: "Noisy" },
  { value: "normals", label: "Normals" },
  { value: "ao", label: "Albedo" },
];

const FEATURE_TOGGLES: {
  key: "shadows" | "ao" | "fresnel";
  label: string;
}[] = [
  { key: "shadows", label: "Bounces" },
  { key: "ao", label: "Ground" },
  { key: "fresnel", label: "Metals" },
];

function StatsOverlay({
  stats,
  debug,
  onDebugChange,
}: {
  stats: FrameStats;
  debug: DebugOptions;
  onDebugChange: (next: DebugOptions) => void;
}) {
  const [copied, setCopied] = useState(false);
  const gpuLabel =
    stats.frameGpu !== null ? `${stats.frameGpu.toFixed(2)} ms` : "n/a";

  const handleCopy = () => {
    void navigator.clipboard.writeText(formatStats(stats)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div css={styles.overlay}>
      <table css={styles.table}>
        <tbody>
          <Row label="FPS" value={`${stats.fps}`} />
          <Row label="CPU" value={`${stats.frameCpu.toFixed(2)} ms`} />
          <Row label="GPU" value={gpuLabel} />
          <Row label="Samples/px" value={`${stats.samplesPerPixel}`} />
          <Row label="Draw calls" value={`${stats.drawCalls}`} />
          <Row
            label="Resolution"
            value={`${stats.resolution[0]}×${stats.resolution[1]}`}
          />
        </tbody>
      </table>

      <div css={styles.separator} />

      <div css={styles.section}>
        <div css={styles.sectionLabel}>Features</div>
        <div css={styles.toggleRow}>
          {FEATURE_TOGGLES.map(({ key, label }) => (
            <Toggle
              key={key}
              label={label}
              active={debug[key]}
              onToggle={() => onDebugChange({ ...debug, [key]: !debug[key] })}
            />
          ))}
        </div>
      </div>

      <div css={styles.separator} />

      <div css={styles.section}>
        <div css={styles.sectionLabel}>View</div>
        <div css={styles.toggleRow}>
          {DEBUG_MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onDebugChange({ ...debug, mode: value })}
              css={[
                styles.modeButton,
                debug.mode === value && styles.modeButtonActive,
              ]}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={handleCopy} css={styles.copyButton}>
        {copied ? "Copied!" : "Copy stats"}
      </button>
    </div>
  );
}

function Toggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      css={[styles.toggleButton, active && styles.toggleButtonActive]}
    >
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td css={styles.label}>{label}</td>
      <td css={styles.value}>{value}</td>
    </tr>
  );
}

const DEFAULT_DEBUG: DebugOptions = {
  mode: "normal",
  shadows: true,
  ao: true,
  fresnel: true,
};

export function PlaygroundCanvas() {
  const [theme] = useTheme();
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const isDark = theme === "system" ? preferDark : theme === "dark";
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [debug, setDebug] = useState<DebugOptions>(DEFAULT_DEBUG);
  const controlsRef = useRef<LoopControls | null>(null);

  const handleDebugChange = (next: DebugOptions) => {
    setDebug(next);
    controlsRef.current?.setDebug(next);
  };

  return (
    <>
      <canvas
        ref={(el) => {
          if (el) {
            const context = init(el, vs, pathtracerFs, displayFs);
            if (context) {
              const controls = start(context, { isDark }, debug, setStats);
              controlsRef.current = controls;
              return controls.cleanup;
            }
          }
        }}
        css={styles.canvas}
      />
      {stats && (
        <StatsOverlay
          stats={stats}
          debug={debug}
          onDebugChange={handleDebugChange}
        />
      )}
    </>
  );
}

const styles = stylex.create({
  canvas: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    touchAction: "none",
  },
  overlay: {
    position: "fixed",
    top: "12px",
    left: "12px",
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(8px)",
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: 1.6,
    zIndex: 1000,
  },
  table: {
    borderSpacing: 0,
  },
  label: {
    paddingRight: "12px",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "left",
  },
  value: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  separator: {
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginTop: "8px",
    marginBottom: "8px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sectionLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  toggleRow: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  toggleButton: {
    padding: "3px 8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "4px",
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "monospace",
    fontSize: "11px",
    cursor: "pointer",
  },
  toggleButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  modeButton: {
    padding: "3px 8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "4px",
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "monospace",
    fontSize: "11px",
    cursor: "pointer",
  },
  modeButtonActive: {
    backgroundColor: "rgba(100, 140, 255, 0.3)",
    color: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(100, 140, 255, 0.6)",
  },
  copyButton: {
    marginTop: "8px",
    width: "100%",
    padding: "4px 0",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "monospace",
    fontSize: "11px",
    cursor: "pointer",
  },
});
