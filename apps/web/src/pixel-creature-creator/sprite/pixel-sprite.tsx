"use client";

import * as stylex from "@stylexjs/stylex";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type {
  CreatureDef,
  Emotion,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { artPxToCssPx } from "#src/pixel-creature-creator/sprite/motion-math/art-px-to-css-px.ts";
import { SPRITE_ART_PX } from "#src/pixel-creature-creator/sprite/motion-math/constants.ts";
import { getEmotionMotion } from "#src/pixel-creature-creator/sprite/motion-math/get-emotion-motion.ts";
import { getReducedMotionEmotion } from "#src/pixel-creature-creator/sprite/motion-math/get-reduced-motion-emotion.ts";
import { snapToArtPixel } from "#src/pixel-creature-creator/sprite/motion-math/snap-to-art-pixel.ts";
import type { EmotionMotion } from "#src/pixel-creature-creator/sprite/motion-math/types.ts";
import { species } from "#src/pixel-creature-creator/sprite/species/index.ts";
import {
  ACCESSORY_PALETTE,
  accessories,
  elements,
} from "#src/pixel-creature-creator/sprite/sprites/index.ts";
import { PixelLayer } from "./pixel-layer";

interface PixelSpriteProps {
  def: CreatureDef;
  emotion?: Emotion;
  scale?: number;
  paused?: boolean;
  "aria-label"?: string;
}

// Accessory tiles are 32×32 and species are 42×42. Thus the accessories are
// centered with a 5-px margin.
const ACCESSORY_TILE_PX = 32;

/**
 * Composite pixel sprite (species PNG + optional accessory tiles) with a
 * requestAnimationFrame loop that moves the rig holding every layer.
 *
 * Why a direct style write over React state: the rAF runs every frame; state
 * updates would re-render every layer at 60Hz. Writing
 * `rig.style.transform` is a direct DOM mutation that reaches the
 * compositor without involving React reconciliation. The mutation lives
 * inside an effect's rAF callback, never inside render — the component
 * itself stays pure.
 *
 * The offsets are *already-scaled CSS pixels*: motion-math returns
 * art-pixels, we snap with `snapToArtPixel` then multiply by `scale`.
 * That ordering keeps each frame on whole-art-pixel boundaries regardless
 * of the chosen scale.
 */
export function PixelSprite({
  def,
  emotion,
  scale = 8,
  paused = false,
  "aria-label": ariaLabel,
}: PixelSpriteProps) {
  const rigRef = useRef<HTMLDivElement>(null);
  const activeEmotion = emotion ?? def.defaultEmotion;
  const prefersReducedMotion = useReducedMotion();

  const speciesEntry = species[def.species];
  const elementEntry = elements[def.type];
  // Accessories stack on top of the species. Unknown IDs are skipped
  // silently — the schema validates IDs upstream.
  const accessoryTiles = def.accessories
    .map((id) => accessories[id])
    .filter((tile): tile is NonNullable<typeof tile> => tile !== undefined);

  useEffect(() => {
    const rig = rigRef.current;
    if (rig === null) return;

    const writeMotion = (motion: EmotionMotion) => {
      const dxCss = artPxToCssPx(snapToArtPixel(motion.body.dx), scale);
      const dyCss = artPxToCssPx(snapToArtPixel(motion.body.dy), scale);
      rig.style.transform = `translate3d(${String(dxCss)}px, ${String(dyCss)}px, 0)`;
    };

    if (paused) {
      writeMotion(getEmotionMotion(activeEmotion, 0));
      return;
    }

    // Reduced motion: write the static t=0 pose once and skip the rAF
    // loop entirely (saves CPU / battery vs. ticking forever at 60Hz).
    if (prefersReducedMotion) {
      writeMotion(getReducedMotionEmotion(activeEmotion, 0));
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = (now - startTime) / 1000;
      writeMotion(getEmotionMotion(activeEmotion, t));
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [activeEmotion, paused, prefersReducedMotion, scale]);

  if (speciesEntry === undefined || elementEntry === undefined) {
    return null;
  }

  const stagePx = SPRITE_ART_PX * scale;
  // Centre the 32-px accessory tile inside the 42-px stage. Halves to 5 art-px,
  // which scales cleanly for any integer scale factor.
  const accessoryOffsetCss = artPxToCssPx(
    (SPRITE_ART_PX - ACCESSORY_TILE_PX) / 2,
    scale,
  );
  const accessorySizePx = ACCESSORY_TILE_PX * scale;

  const filter =
    elementEntry.hueRotateDeg === 0
      ? undefined
      : `hue-rotate(${String(elementEntry.hueRotateDeg)}deg)`;

  return (
    <div
      role={ariaLabel === undefined ? undefined : "img"}
      aria-label={ariaLabel}
      data-paused={paused ? "true" : undefined}
      css={[
        styles.stage,
        styles.stageSize(`${String(stagePx)}px`),
        filter !== undefined && styles.stageFilter(filter),
      ]}
    >
      {/* Accessories ride along with the body so a hat doesn't lag behind a bob. */}
      <div ref={rigRef} css={styles.rig}>
        <div css={styles.layer}>
          <Image
            src={speciesEntry.idle}
            alt=""
            width={stagePx}
            height={stagePx}
            unoptimized
            style={{
              width: `${String(stagePx)}px`,
              height: `${String(stagePx)}px`,
              imageRendering: "pixelated",
              display: "block",
            }}
          />
        </div>
        {accessoryTiles.map((accessory) => (
          <div
            key={accessory.id}
            css={[
              styles.layer,
              styles.accessoryLayerRect(
                `${String(accessoryOffsetCss)}px`,
                `${String(accessorySizePx)}px`,
              ),
            ]}
          >
            <PixelLayer
              tile={accessory.tile}
              palette={ACCESSORY_PALETTE}
              scale={scale}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    position: "relative",
    display: "inline-block",
  },
  stageSize: (size: string) => ({
    width: size,
    height: size,
  }),
  stageFilter: (filter: string) => ({
    filter,
  }),
  rig: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    willChange: "transform",
    transform: "translate3d(0, 0, 0)",
  },
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
  },
  accessoryLayerRect: (offset: string, size: string) => ({
    left: offset,
    top: offset,
    width: size,
    height: size,
  }),
});
