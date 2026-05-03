"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { Button } from "#src/components/shared/button.tsx";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { SourceImage } from "./types";

interface SourceImageInputProps {
  source: SourceImage | null;
  onSourceChange: (source: SourceImage) => void;
}

export function SourceImageInput({
  source,
  onSourceChange,
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

  return (
    <div
      css={[styles.root, isDragging && styles.rootActive]}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <Button
        variant="primary"
        icon={<UploadSimpleIcon size={18} weight="bold" aria-hidden="true" />}
        onClick={() => {
          inputRef.current?.click();
        }}
        data-testid="source-pick"
      >
        {source === null
          ? t({ en: "Choose source image", zh: "选择源图" })
          : t({ en: "Replace source image", zh: "替换源图" })}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        css={styles.input}
        data-testid="source-input"
      />
      <p css={styles.hint}>
        {source === null
          ? t({
              en: "Drop a sprite sheet here or click to choose. PNG, JPG, WebP supported.",
              zh: "在此拖放精灵表或点击选择。支持 PNG、JPG、WebP。",
            })
          : `${source.name} — ${String(source.width)}×${String(source.height)}`}
      </p>
      {error !== null ? <p css={styles.error}>{error}</p> : null}
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    padding: space._3,
    border: `1px dashed ${color.border}`,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
  },
  rootActive: {
    borderColor: color.brandPixelCreatureCreator,
    backgroundColor: color.backgroundHover,
  },
  input: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  hint: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  error: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.brandBristol,
  },
});
