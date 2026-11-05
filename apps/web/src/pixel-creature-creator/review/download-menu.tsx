"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { layer, shadow, space } from "@tuja/ui/tokens.stylex";
import { downloadBlob } from "@tuja/ui/utils/download-blob";
import { useEffect, useRef, useState } from "react";
import type {
  CreatureDef,
  Emotion,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { actionRowStyles } from "./action-row.stylex";
import type { LoreData } from "./creature-card";
import { exportCardPng } from "./export-card-png";
import { exportSpritePng } from "./export-sprite-png";
import { slugifyName } from "./slugify-name";

interface DownloadMenuProps {
  def: CreatureDef;
  emotion: Emotion;
  lore: LoreData | null;
  onExportFailed: () => void;
}

export function DownloadMenu({
  def,
  emotion,
  lore,
  onExportFailed,
}: DownloadMenuProps) {
  const locale = useLocale();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const downloadTriggerRef = useRef<HTMLButtonElement>(null);
  const labels = {
    download: t({ en: "Download PNG", zh: "下载 PNG" }),
    downloadSprite: t({ en: "Sprite", zh: "精灵" }),
    downloadCard: t({ en: "Card", zh: "卡牌" }),
  };

  // Close the download menu when clicking outside it. `pointerdown` (not
  // `click`) so the dropdown closes before any newly-clicked button has a
  // chance to mistakenly read it as still-open.
  useEffect(() => {
    if (!downloadOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = downloadRef.current;
      if (root === null) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setDownloadOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [downloadOpen]);

  // Close the download menu on Escape and return focus to the trigger so
  // keyboard users don't get stranded inside the closed menu's tab order.
  useEffect(() => {
    if (!downloadOpen) return;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDownloadOpen(false);
        downloadTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, [downloadOpen]);

  const buildFilename = (kind: "sprite" | "card") => {
    const base = slugifyName(def.name);
    return `creature-${base}-${kind}-${emotion}.png`;
  };

  const handleDownloadSprite = async () => {
    setDownloadOpen(false);
    try {
      const blob = await exportSpritePng(def, emotion);
      downloadBlob(blob, buildFilename("sprite"));
    } catch {
      onExportFailed();
    }
  };

  const handleDownloadCard = async () => {
    setDownloadOpen(false);
    try {
      const blob = await exportCardPng(def, emotion, lore, locale);
      downloadBlob(blob, buildFilename("card"));
    } catch {
      onExportFailed();
    }
  };

  return (
    <div css={styles.downloadWrap} ref={downloadRef}>
      <button
        type="button"
        ref={downloadTriggerRef}
        css={[
          buttonReset.base,
          typeRole.label,
          corner.radius_round,
          actionRowStyles.button,
          transition.colors,
        ]}
        aria-haspopup="menu"
        aria-expanded={downloadOpen}
        onClick={() => {
          setDownloadOpen((open) => !open);
        }}
        data-testid="action-download"
        aria-label={labels.download}
      >
        {labels.download}
      </button>
      {downloadOpen && (
        <div role="menu" css={[corner.radius_2, styles.downloadMenu]}>
          <button
            type="button"
            role="menuitem"
            css={[
              buttonReset.base,
              typeRole.label,
              corner.radius_2,
              a11y.touchRow,
              quietSurface.interactive,
              styles.menuItem,
            ]}
            onClick={() => {
              void handleDownloadSprite();
            }}
            data-testid="action-download-sprite"
          >
            {labels.downloadSprite}
          </button>
          <button
            type="button"
            role="menuitem"
            css={[
              buttonReset.base,
              typeRole.label,
              corner.radius_2,
              a11y.touchRow,
              quietSurface.interactive,
              styles.menuItem,
            ]}
            onClick={() => {
              void handleDownloadCard();
            }}
            data-testid="action-download-card"
          >
            {labels.downloadCard}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  downloadWrap: {
    position: "relative",
  },
  downloadMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    insetInlineStart: 0,
    minInlineSize: "10rem",
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    padding: space._0,
    display: "flex",
    flexDirection: "column",
    boxShadow: shadow._2,
    // Anchored to its trigger, so it lifts over the page around it rather than
    // claiming the viewport the way an overlay does.
    zIndex: layer.raised,
  },
  menuItem: {
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "left",
  },
});
