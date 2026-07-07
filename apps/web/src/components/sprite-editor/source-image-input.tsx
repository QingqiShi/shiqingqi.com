"use client";

import { FilmStripIcon } from "@phosphor-icons/react/dist/ssr/FilmStrip";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ScissorsIcon } from "@phosphor-icons/react/dist/ssr/Scissors";
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import type { SourceImage } from "./types";

interface SourceImageInputProps {
  source: SourceImage | null;
  onSourceChange: (source: SourceImage) => void;
  /**
   * `hero` is the full drop target shown in the empty stage; `compact` is the
   * inline file row that lives in the sidebar once a sheet is loaded. The
   * ingest/error logic is identical — only the presentation differs.
   */
  variant?: "hero" | "compact";
}

export function SourceImageInput({
  source,
  onSourceChange,
  variant = "hero",
}: SourceImageInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Hoist translations to render scope — `t()` cannot be called from async
  // callbacks per the i18n/no-t-outside-render rule.
  const notImageError = t({ en: "Not an image file.", zh: "不是图片文件。" });
  const decodeError = t({
    en: "Could not decode image.",
    zh: "无法解码图片。",
  });

  const ingest = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(notImageError);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      onSourceChange({
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        name: file.name,
      });
      setError(null);
    } catch {
      setError(decodeError);
    }
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    void ingest(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files.item(0);
    if (file === null) return;
    void ingest(file);
  };

  const dragHandlers = {
    onDragEnter: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    onDragLeave: () => {
      setIsDragging(false);
    },
    onDrop: handleDrop,
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      onChange={handleFile}
      css={a11y.srOnly}
      data-testid="source-input"
    />
  );

  // Compact row — sidebar header once a sheet is loaded.
  if (variant === "compact") {
    return (
      <div
        css={[styles.compact, isDragging && styles.compactDragging]}
        {...dragHandlers}
      >
        <button
          type="button"
          css={styles.compactSwap}
          onClick={() => {
            inputRef.current?.click();
          }}
          data-testid="source-pick"
        >
          <UploadSimpleIcon size={16} weight="bold" aria-hidden="true" />
          {t({ en: "Replace", zh: "替换" })}
        </button>
        <div css={styles.compactMeta}>
          <span css={styles.compactName} title={source?.name}>
            {source?.name ?? ""}
          </span>
          <span css={styles.compactDims}>
            {source !== null
              ? `${String(source.width)} × ${String(source.height)} px`
              : ""}
          </span>
        </div>
        {fileInput}
        {error !== null ? (
          <p role="alert" css={styles.compactError}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  // Hero drop target — the empty stage.
  return (
    <div
      css={[styles.hero, isDragging && styles.heroDragging]}
      {...dragHandlers}
    >
      <span css={styles.heroIcon} aria-hidden="true">
        <UploadSimpleIcon size={28} weight="bold" />
      </span>
      <h2 css={styles.heroTitle}>
        {t({ en: "Drop a sprite sheet to begin", zh: "拖入精灵表开始" })}
      </h2>
      <p css={styles.heroHint}>
        {t({
          en: "Drag a file anywhere here, or pick one. PNG, JPG and WebP are supported.",
          zh: "将文件拖到此处，或选择一个。支持 PNG、JPG 和 WebP。",
        })}
      </p>
      <Button
        variant="primary"
        icon={<UploadSimpleIcon size={18} weight="bold" aria-hidden="true" />}
        onClick={() => {
          inputRef.current?.click();
        }}
        data-testid="source-pick"
      >
        {t({ en: "Choose source image", zh: "选择源图" })}
      </Button>
      {fileInput}
      {error !== null ? (
        <p role="alert" css={styles.heroError}>
          {error}
        </p>
      ) : null}
      <ul css={styles.capabilities}>
        <li css={styles.capability}>
          <ScissorsIcon
            size={18}
            weight="bold"
            aria-hidden="true"
            css={styles.capabilityIcon}
          />
          <span>{t({ en: "Slice into cells", zh: "切分为单元格" })}</span>
        </li>
        <li css={styles.capability}>
          <PencilSimpleIcon
            size={18}
            weight="bold"
            aria-hidden="true"
            css={styles.capabilityIcon}
          />
          <span>{t({ en: "Clean up pixels", zh: "清理像素" })}</span>
        </li>
        <li css={styles.capability}>
          <FilmStripIcon
            size={18}
            weight="bold"
            aria-hidden="true"
            css={styles.capabilityIcon}
          />
          <span>{t({ en: "Assemble frames", zh: "组装动画帧" })}</span>
        </li>
      </ul>
    </div>
  );
}

const styles = stylex.create({
  // Hero ------------------------------------------------------------------
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space._3,
    width: "100%",
    height: "100%",
    minHeight: "320px",
    paddingBlock: space._9,
    paddingInline: space._4,
    textAlign: "center",
    border: `2px dashed ${color.neutralBorder}`,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurface,
    boxSizing: "border-box",
    transition: {
      default: `border-color ${duration._200} ${easing.easeOut}, background-color ${duration._200} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  heroDragging: {
    borderColor: color.accent,
    backgroundColor: color.surfaceAccentSubtle,
  },
  heroIcon: {
    display: "grid",
    placeItems: "center",
    width: "60px",
    height: "60px",
    borderRadius: border.radius_round,
    color: color.accent,
    backgroundColor: color.surfaceAccentSubtle,
  },
  heroTitle: {
    margin: 0,
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingSnug,
    color: color.textMain,
    textWrap: "balance",
  },
  heroHint: {
    margin: 0,
    maxInlineSize: "42ch",
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    textWrap: "pretty",
  },
  heroError: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.dangerText,
  },
  capabilities: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space._5,
    margin: 0,
    marginBlockStart: space._2,
    padding: 0,
    listStyle: "none",
  },
  capability: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
  },
  capabilityIcon: {
    color: color.accent,
    flexShrink: 0,
  },

  // Compact ---------------------------------------------------------------
  compact: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._1,
    transition: {
      default: `background-color ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  compactDragging: {
    backgroundColor: color.surfaceAccentSubtle,
    borderRadius: border.radius_2,
  },
  compactSwap: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._0,
    flexShrink: 0,
    paddingBlock: space._1,
    paddingInline: space._2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    fontFamily: "inherit",
    color: color.textMain,
    backgroundColor: {
      default: color.bgInteractiveRest,
      ":hover": color.bgInteractiveHover,
    },
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_2,
    cursor: "pointer",
    transition: {
      default: `background-color ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  compactMeta: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    lineHeight: font.lineHeight_2,
  },
  compactName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  compactDims: {
    fontSize: font.uiCaption,
    fontFamily: font.familyMono,
    fontVariantNumeric: "tabular-nums",
    color: color.textMuted,
  },
  compactError: {
    flexBasis: "100%",
    margin: 0,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.dangerText,
  },
});
