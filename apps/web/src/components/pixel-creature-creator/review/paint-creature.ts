import { makeCanvas, type Canvas2dContext } from "#src/utils/make-canvas.ts";
import { SPRITE_ART_PX } from "../sprite/motion-math/constants";
import { species } from "../sprite/species";
import { ACCESSORY_PALETTE, accessories, elements } from "../sprite/sprites";
import type { CreatureDef, Emotion } from "../state/creature-def-schema";
import { hexToRgba } from "./hex-to-rgba";

const SPRITE_EXPORT_SCALE = 8;
/** Full-resolution size, in pixels, of an exported creature sprite. */
export const SPRITE_EXPORT_PX = SPRITE_ART_PX * SPRITE_EXPORT_SCALE;
const ACCESSORY_TILE_PX = 32;

/**
 * Decode a tile (rectangular grid of palette indices) into a flat RGBA
 * buffer at art resolution. Mirrors `pixel-layer.tsx`'s decode loop:
 * ` ` is transparent, any other character is a hex digit referencing the
 * palette index.
 */
function tileToBuffer(
  tile: string[],
  palette: string[],
): { data: Uint8ClampedArray; rows: number; cols: number } | null {
  const rows = tile.length;
  if (rows === 0) return null;
  const cols = tile[0].length;
  if (cols === 0) return null;
  const data = new Uint8ClampedArray(rows * cols * 4);
  for (let r = 0; r < rows; r += 1) {
    const row = tile[r];
    for (let c = 0; c < cols; c += 1) {
      const ch = row[c];
      const i = (r * cols + c) * 4;
      if (ch === " ") {
        data[i + 3] = 0;
        continue;
      }
      const idx = parseInt(ch, 16);
      if (Number.isNaN(idx) || idx >= palette.length) {
        data[i + 3] = 0;
        continue;
      }
      const rgba = hexToRgba(palette[idx]);
      if (rgba === null) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = rgba.r;
      data[i + 1] = rgba.g;
      data[i + 2] = rgba.b;
      data[i + 3] = rgba.a;
    }
  }
  return { data, rows, cols };
}

function speciesUrl(speciesId: string): string | null {
  const entry = species[speciesId];
  if (entry === undefined) return null;
  // Vite test runtime returns the asset import as a plain URL string;
  // Next.js production typing returns a StaticImageData with `.src`.
  // Handle both without an `as` assertion.
  const idle: unknown = entry.idle;
  if (typeof idle === "string") return idle;
  if (
    idle !== null &&
    typeof idle === "object" &&
    "src" in idle &&
    typeof idle.src === "string"
  ) {
    return idle.src;
  }
  return null;
}

type SpeciesImage = HTMLImageElement | ImageBitmap;

async function loadSpeciesImage(speciesId: string): Promise<SpeciesImage> {
  const url = speciesUrl(speciesId);
  if (url === null) {
    throw new Error(`PNG export: unknown species "${speciesId}"`);
  }
  // Prefer the bitmap path — works inside OffscreenCanvas / Web Workers and
  // produces a decoded raster ready for `drawImage` without DOM access.
  if (typeof fetch === "function" && typeof createImageBitmap === "function") {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await createImageBitmap(blob);
    } catch (err) {
      throw new Error(
        `PNG export: failed to load species "${speciesId}" — ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }
  if (typeof Image === "undefined") {
    throw new Error("PNG export: image loading is unsupported in this runtime");
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`PNG export: failed to load species "${speciesId}"`));
    };
    img.src = url;
  });
}

/**
 * Paint an accessory tile onto `ctx` at the given destination rectangle.
 * Stages on a temporary art-resolution canvas first so smoothing-disabled
 * `drawImage` upscales whole-pixel-aligned blocks rather than interpolating.
 */
function paintAccessoryTile(
  ctx: Canvas2dContext,
  tile: string[],
  dx: number,
  dy: number,
  sizePx: number,
): boolean {
  const buf = tileToBuffer(tile, ACCESSORY_PALETTE);
  if (buf === null) return false;
  const stage = makeCanvas(buf.cols, buf.rows);
  if (stage === null) return false;
  try {
    const imageData = new ImageData(buf.cols, buf.rows);
    imageData.data.set(buf.data);
    stage.ctx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(stage.canvas, dx, dy, sizePx, sizePx);
    return true;
  } finally {
    stage.cleanup();
  }
}

/**
 * Composite the species image and accessory tiles into `ctx` at the
 * given destination rectangle. The type's hue-rotate filter is applied to
 * the entire stage so accessories tint alongside the species art.
 */
export async function paintCreature(
  ctx: Canvas2dContext,
  def: CreatureDef,
  _emotion: Emotion,
  dx: number,
  dy: number,
  sizePx: number,
): Promise<boolean> {
  const elementEntry = elements[def.type];
  if (elementEntry === undefined) return false;
  const speciesImg = await loadSpeciesImage(def.species);

  const accessoryScale = sizePx / SPRITE_ART_PX;
  const accessoryOffset =
    ((SPRITE_ART_PX - ACCESSORY_TILE_PX) / 2) * accessoryScale;
  const accessorySize = ACCESSORY_TILE_PX * accessoryScale;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (elementEntry.hueRotateDeg !== 0) {
    ctx.filter = `hue-rotate(${String(elementEntry.hueRotateDeg)}deg)`;
  }
  ctx.drawImage(speciesImg, dx, dy, sizePx, sizePx);

  for (const id of def.accessories) {
    const accessory = accessories[id];
    if (accessory === undefined) continue;
    if (
      !paintAccessoryTile(
        ctx,
        accessory.tile,
        dx + accessoryOffset,
        dy + accessoryOffset,
        accessorySize,
      )
    ) {
      ctx.restore();
      return false;
    }
  }
  ctx.restore();
  return true;
}
