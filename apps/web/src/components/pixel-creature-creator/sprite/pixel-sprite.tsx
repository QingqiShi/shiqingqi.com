"use client";

import * as stylex from "@stylexjs/stylex";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CreatureDef, Emotion } from "../state/creature-schema";
import {
  type EmotionMotion,
  SPRITE_ART_PX,
  artPxToCssPx,
  getEmotionMotion,
  getReducedMotionEmotion,
  snapToArtPixel,
} from "./motion-math";
import { PixelLayer } from "./pixel-layer";
import { species } from "./species";
import { ACCESSORY_PALETTE, accessories, types } from "./sprites";

interface PixelSpriteProps {
  def: CreatureDef;
  emotion?: Emotion;
  scale?: number;
  paused?: boolean;
  "aria-label"?: string;
}

// Accessory tiles were authored at 32×32 in the v:1 multi-axis pipeline.
// Species are 42×42, so accessories sit centered with a 5-px margin until
// per-species accessory anchors land in the variants follow-up PR.
const ACCESSORY_TILE_PX = 32;

/**
 * Composite pixel sprite (species PNG + optional accessory tiles) with a
 * requestAnimationFrame loop that updates CSS variables on the wrapper.
 *
 * Why CSS variables over React state: the rAF runs every frame; state
 * updates would re-render every layer at 60Hz. Writing
 * `wrapper.style.setProperty(...)` is a direct DOM mutation that reaches
 * the layout engine without involving React reconciliation. The mutation
 * lives inside an effect's rAF callback, never inside render — the
 * component itself stays pure.
 *
 * The CSS values are *already-scaled CSS pixels*: motion-math returns
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
  const stageRef = useRef<HTMLDivElement>(null);
  const activeEmotion = emotion ?? def.defaultEmotion;

  const speciesEntry = species[def.species];
  const typeEntry = types[def.type];
  // Accessories stack on top of the species. Unknown IDs are skipped
  // silently — the schema validates IDs upstream.
  const accessoryTiles = def.accessories
    .map((id) => accessories[id])
    .filter((tile): tile is NonNullable<typeof tile> => tile !== undefined);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return;

    const writeMotion = (motion: EmotionMotion) => {
      const dxCss = artPxToCssPx(snapToArtPixel(motion.body.dx), scale);
      const dyCss = artPxToCssPx(snapToArtPixel(motion.body.dy), scale);
      stage.style.setProperty("--pcc-body-dx", `${String(dxCss)}px`);
      stage.style.setProperty("--pcc-body-dy", `${String(dyCss)}px`);
    };

    if (paused) {
      writeMotion(getEmotionMotion(activeEmotion, 0));
      return;
    }

    // `matchMedia` may be absent in some test environments — fall back to a
    // matches: false stub. We arm a `change` listener so toggling the OS
    // setting rearms or stops the rAF without remounting.
    const reducedQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = (now - startTime) / 1000;
      writeMotion(getEmotionMotion(activeEmotion, t));
      rafId = window.requestAnimationFrame(tick);
    };

    const stopRaf = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const startMotion = () => {
      stopRaf();
      // Reduced motion: write the static t=0 pose once and skip the rAF
      // loop entirely (saves CPU / battery vs. ticking forever at 60Hz).
      if (reducedQuery !== null && reducedQuery.matches) {
        writeMotion(getReducedMotionEmotion(activeEmotion, 0));
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    startMotion();

    const onReducedChange = () => {
      startMotion();
    };
    reducedQuery?.addEventListener("change", onReducedChange);

    return () => {
      stopRaf();
      reducedQuery?.removeEventListener("change", onReducedChange);
    };
  }, [activeEmotion, paused, scale]);

  if (speciesEntry === undefined || typeEntry === undefined) {
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
    typeEntry.hueRotateDeg === 0
      ? undefined
      : `hue-rotate(${String(typeEntry.hueRotateDeg)}deg)`;

  return (
    <div
      ref={stageRef}
      role={ariaLabel === undefined ? undefined : "img"}
      aria-label={ariaLabel}
      data-paused={paused ? "true" : undefined}
      style={{
        width: `${String(stagePx)}px`,
        height: `${String(stagePx)}px`,
        filter,
      }}
      css={styles.stage}
    >
      <div css={[styles.layer, styles.bodyLayer]}>
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
          css={[styles.layer, styles.accessoryLayer]}
          style={{
            left: `${String(accessoryOffsetCss)}px`,
            top: `${String(accessoryOffsetCss)}px`,
            width: `${String(accessorySizePx)}px`,
            height: `${String(accessorySizePx)}px`,
          }}
        >
          <PixelLayer
            tile={accessory.tile}
            palette={ACCESSORY_PALETTE}
            scale={scale}
          />
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  stage: {
    position: "relative",
    display: "inline-block",
  },
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    willChange: "transform",
  },
  bodyLayer: {
    transform:
      "translate3d(var(--pcc-body-dx, 0px), var(--pcc-body-dy, 0px), 0)",
  },
  accessoryLayer: {
    // Accessories ride along with the body so a hat doesn't lag behind a bob.
    transform:
      "translate3d(var(--pcc-body-dx, 0px), var(--pcc-body-dy, 0px), 0)",
  },
});
