import type { SupportedLocale } from "#src/types.ts";
import { SPRITE_ART_PX } from "../sprite/motion-math";
import { species } from "../sprite/species";
import { ACCESSORY_PALETTE, accessories, types } from "../sprite/sprites";
import type { CreatureDef, Emotion } from "../state/creature-schema";
import { computeSeedStats, STAT_KEYS } from "../state/seed-stats";
import type { LoreData } from "./creature-card";

/**
 * PNG export for the review screen. Two pure async functions:
 *
 *  - `exportSpritePng`: composites the creature at scale 8 (336×336) using
 *    the same species + accessories stacking as `<PixelSprite>` but rendered
 *    to a canvas at the paused t=0 pose. Returns a `Blob` of type `image/png`.
 *  - `exportCardPng`: renders a 960×1280 faux-Pokedex card — header band,
 *    sprite "screen", stat bars, lore text. Caller passes the active app
 *    locale so the output mirrors what the user saw on screen.
 *
 * Both prefer `OffscreenCanvas` when available (fast path, no DOM thrash)
 * and fall back to a hidden `<canvas>` appended to `document.body` when not
 * (e.g. older browsers; jsdom does ship with `OffscreenCanvas` in recent
 * versions but its 2D context support is limited).
 */

const SPRITE_EXPORT_SCALE = 8;
const SPRITE_EXPORT_PX = SPRITE_ART_PX * SPRITE_EXPORT_SCALE;
const ACCESSORY_TILE_PX = 32;

const CARD_WIDTH = 960;
const CARD_HEIGHT = 1280;

type CardCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

interface CanvasHandle {
  ctx: CardCtx;
  toBlob: () => Promise<Blob>;
  cleanup: () => void;
}

function makeCanvas(width: number, height: number): CanvasHandle | null {
  // Prefer `OffscreenCanvas` when available — keeps the export off the DOM
  // and lets future callers (e.g. a Web Worker) reuse this code as-is.
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      return {
        ctx,
        toBlob: () => canvas.convertToBlob({ type: "image/png" }),
        cleanup: () => {
          // Nothing to clean up — the canvas has no DOM presence.
        },
      };
    }
  }

  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // Hide off-screen rather than `display: none`, which some browsers treat
  // as a hint to skip rasterisation.
  canvas.style.position = "fixed";
  canvas.style.left = "-99999px";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    canvas.remove();
    return null;
  }
  return {
    ctx,
    toBlob: () =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob === null) {
            reject(new Error("PNG export: canvas.toBlob returned null"));
            return;
          }
          resolve(blob);
        }, "image/png");
      }),
    cleanup: () => {
      canvas.remove();
    },
  };
}

interface RgbaPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hexToRgba(hex: string): RgbaPixel | null {
  if (hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b, a: 255 };
}

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

interface StageHandle {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: CardCtx;
  cleanup: () => void;
}

/**
 * Acquire a 2D rendering canvas, preferring `OffscreenCanvas` and falling
 * through to a hidden DOM canvas when the offscreen path is unavailable or
 * its 2D context cannot be created.
 */
function getRenderingCanvas(width: number, height: number): StageHandle | null {
  if (typeof OffscreenCanvas !== "undefined") {
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext("2d");
    if (ctx !== null) {
      return {
        canvas: offscreen,
        ctx,
        cleanup: () => {
          // No DOM presence — nothing to clean up.
        },
      };
    }
  }
  if (typeof document === "undefined") return null;
  const dom = document.createElement("canvas");
  dom.width = width;
  dom.height = height;
  const ctx = dom.getContext("2d");
  if (ctx === null) {
    dom.remove();
    return null;
  }
  return {
    canvas: dom,
    ctx,
    cleanup: () => {
      dom.remove();
    },
  };
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
  ctx: CardCtx,
  tile: string[],
  dx: number,
  dy: number,
  sizePx: number,
): boolean {
  const buf = tileToBuffer(tile, ACCESSORY_PALETTE);
  if (buf === null) return false;
  const stage = getRenderingCanvas(buf.cols, buf.rows);
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
async function paintCreature(
  ctx: CardCtx,
  def: CreatureDef,
  _emotion: Emotion,
  dx: number,
  dy: number,
  sizePx: number,
): Promise<boolean> {
  const typeEntry = types[def.type];
  if (typeEntry === undefined) return false;
  const speciesImg = await loadSpeciesImage(def.species);

  const accessoryScale = sizePx / SPRITE_ART_PX;
  const accessoryOffset =
    ((SPRITE_ART_PX - ACCESSORY_TILE_PX) / 2) * accessoryScale;
  const accessorySize = ACCESSORY_TILE_PX * accessoryScale;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (typeEntry.hueRotateDeg !== 0) {
    ctx.filter = `hue-rotate(${String(typeEntry.hueRotateDeg)}deg)`;
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

interface CardLabels {
  typeName: string;
  vigour: string;
  spark: string;
  ward: string;
  hustle: string;
  loreHeading: string;
  lorePlaceholder: string;
  unnamed: string;
}

function getCardLabels(def: CreatureDef, locale: SupportedLocale): CardLabels {
  const type = types[def.type];
  const typeName = type === undefined ? def.type : type.label[locale];
  return locale === "en"
    ? {
        typeName,
        vigour: "Vigour",
        spark: "Spark",
        ward: "Ward",
        hustle: "Hustle",
        loreHeading: "Lore",
        lorePlaceholder: "Lore coming soon",
        unnamed: "Unnamed creature",
      }
    : {
        typeName,
        vigour: "体力",
        spark: "灵感",
        ward: "守护",
        hustle: "干劲",
        loreHeading: "传说",
        lorePlaceholder: "传说即将到来",
        unnamed: "未命名生物",
      };
}

interface RoundRectArgs {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

function roundRectPath(ctx: CardCtx, r: RoundRectArgs): void {
  const { x, y, width, height, radius } = r;
  const max = Math.min(width, height) / 2;
  const rad = Math.min(radius, max);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + width - rad, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + rad);
  ctx.lineTo(x + width, y + height - rad);
  ctx.quadraticCurveTo(x + width, y + height, x + width - rad, y + height);
  ctx.lineTo(x + rad, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function wrapText(ctx: CardCtx, text: string, maxWidth: number): string[] {
  if (text.length === 0) return [];
  // Latin paragraphs split on whitespace; CJK runs without spaces, so when
  // there's no whitespace in the input we wrap per character instead.
  if (/\s/.test(text)) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current.length > 0) lines.push(current);
        current = word;
      }
    }
    if (current.length > 0) lines.push(current);
    return lines;
  }
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const candidate = current + ch;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current.length > 0) lines.push(current);
      current = ch;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * Tint helper. We can't rely on `color-mix` inside Canvas2D fillStyle
 * across all engines, so blend by hand — `accent × pct + base × (1 − pct)`.
 */
function blendHex(accent: string, base: string, pct: number): string {
  const a = hexToRgba(accent);
  const b = hexToRgba(base);
  if (a === null || b === null) return base;
  const w = Math.max(0, Math.min(1, pct));
  const r = Math.round(a.r * w + b.r * (1 - w));
  const g = Math.round(a.g * w + b.g * (1 - w));
  const bl = Math.round(a.b * w + b.b * (1 - w));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function lighten(accent: string, pct: number): string {
  return blendHex("#ffffff", accent, pct);
}

async function drawCard(
  ctx: CardCtx,
  def: CreatureDef,
  emotion: Emotion,
  lore: LoreData | null,
  locale: SupportedLocale,
): Promise<void> {
  const width = CARD_WIDTH;
  const height = CARD_HEIGHT;
  const type = types[def.type];
  const accent = type?.accentColor ?? "#888888";
  const labels = getCardLabels(def, locale);
  const fontFamily = "sans-serif";

  // Outer card. We always render against a stable light background so saved
  // cards stay legible regardless of the user's theme.
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, {
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    radius: 32,
  });
  ctx.fill();

  // Header band.
  ctx.save();
  roundRectPath(ctx, {
    x: 24,
    y: 24,
    width: width - 48,
    height: 200,
    radius: 32,
  });
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(24, 24, width - 48, 200);
  // Diagonal sheen so the band reads as printed-card sheen rather than a
  // flat rectangle.
  const sheen = ctx.createLinearGradient(24, 24, width - 24, 224);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(0.6, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(24, 24, width - 48, 200);
  ctx.restore();

  // Header text.
  const displayName = def.name.length > 0 ? def.name : labels.unnamed;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `700 56px ${fontFamily}`;
  ctx.fillText(displayName, 64, 124, width - 128);
  ctx.font = `600 28px ${fontFamily}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(labels.typeName.toUpperCase(), 64, 180);
  ctx.globalAlpha = 1;

  // Sprite "screen" panel.
  const screenX = 80;
  const screenY = 280;
  const screenW = width - 160;
  const screenH = 480;
  ctx.fillStyle = blendHex(accent, "#f4f4f4", 0.14);
  roundRectPath(ctx, {
    x: screenX,
    y: screenY,
    width: screenW,
    height: screenH,
    radius: 24,
  });
  ctx.fill();

  // Inset shadow approximation.
  ctx.save();
  roundRectPath(ctx, {
    x: screenX,
    y: screenY,
    width: screenW,
    height: screenH,
    radius: 24,
  });
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 6;
  ctx.strokeRect(screenX, screenY, screenW, screenH);
  ctx.restore();

  // Sprite — centred in the screen at SPRITE_EXPORT_PX.
  const spriteX = screenX + (screenW - SPRITE_EXPORT_PX) / 2;
  const spriteY = screenY + (screenH - SPRITE_EXPORT_PX) / 2;
  await paintCreature(ctx, def, emotion, spriteX, spriteY, SPRITE_EXPORT_PX);

  // Stats panel.
  const statsTop = screenY + screenH + 48;
  const stats = computeSeedStats(def);
  const statLabelLookup: Record<(typeof STAT_KEYS)[number], string> = {
    vigour: labels.vigour,
    spark: labels.spark,
    ward: labels.ward,
    hustle: labels.hustle,
  };
  const statRowHeight = 56;
  const statLabelX = 96;
  const statBarX = statLabelX + 200;
  const statValueX = width - 96;
  const statBarW = statValueX - statBarX - 32;
  ctx.textBaseline = "middle";
  for (let i = 0; i < STAT_KEYS.length; i += 1) {
    const key = STAT_KEYS[i];
    const value = Math.max(0, Math.min(100, stats[key]));
    const y = statsTop + i * statRowHeight + 24;
    ctx.fillStyle = "#666666";
    ctx.font = `600 26px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.fillText(statLabelLookup[key], statLabelX, y);
    // Bar track.
    ctx.fillStyle = "#e0e0e0";
    roundRectPath(ctx, {
      x: statBarX,
      y: y - 12,
      width: statBarW,
      height: 16,
      radius: 8,
    });
    ctx.fill();
    // Bar fill — soft gradient from a lighter tint to the accent.
    const fillW = Math.round((statBarW * value) / 100);
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(statBarX, y, statBarX + fillW, y);
      grad.addColorStop(0, lighten(accent, 0.3));
      grad.addColorStop(1, accent);
      ctx.fillStyle = grad;
      roundRectPath(ctx, {
        x: statBarX,
        y: y - 12,
        width: fillW,
        height: 16,
        radius: 8,
      });
      ctx.fill();
    }
    ctx.fillStyle = "#222222";
    ctx.font = `700 26px ${fontFamily}`;
    ctx.textAlign = "right";
    ctx.fillText(String(value), statValueX, y);
  }

  // Lore panel.
  const loreTop = statsTop + STAT_KEYS.length * statRowHeight + 32;
  const loreH = height - loreTop - 56;
  ctx.fillStyle = "#f5f5f5";
  roundRectPath(ctx, {
    x: 80,
    y: loreTop,
    width: width - 160,
    height: loreH,
    radius: 20,
  });
  ctx.fill();
  ctx.strokeStyle = "#cccccc";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  roundRectPath(ctx, {
    x: 80,
    y: loreTop,
    width: width - 160,
    height: loreH,
    radius: 20,
  });
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#666666";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 22px ${fontFamily}`;
  ctx.fillText(labels.loreHeading.toUpperCase(), 112, loreTop + 44);

  // Pick the lore matching the export locale; fall back to the other half
  // if only one was supplied (e.g. the manual fallback in a single language).
  const primary = locale === "zh" ? lore?.loreZh : lore?.loreEn;
  const secondary = locale === "zh" ? lore?.loreEn : lore?.loreZh;
  const loreText =
    primary !== undefined && primary.length > 0
      ? primary
      : secondary !== undefined && secondary.length > 0
        ? secondary
        : "";
  if (loreText.length > 0) {
    ctx.fillStyle = "#222222";
    ctx.font = `400 26px ${fontFamily}`;
    const wrapped = wrapText(ctx, loreText, width - 240);
    let y = loreTop + 88;
    for (const line of wrapped) {
      if (y > loreTop + loreH - 24) break;
      ctx.fillText(line, 112, y);
      y += 36;
    }
  } else {
    ctx.fillStyle = "#888888";
    ctx.font = `italic 400 26px ${fontFamily}`;
    ctx.fillText(labels.lorePlaceholder, 112, loreTop + 88);
  }
}

export async function exportSpritePng(
  def: CreatureDef,
  emotion: Emotion,
): Promise<Blob> {
  const handle = makeCanvas(SPRITE_EXPORT_PX, SPRITE_EXPORT_PX);
  if (handle === null) {
    throw new Error("PNG export: canvas is unavailable in this environment");
  }
  try {
    handle.ctx.clearRect(0, 0, SPRITE_EXPORT_PX, SPRITE_EXPORT_PX);
    if (
      !(await paintCreature(handle.ctx, def, emotion, 0, 0, SPRITE_EXPORT_PX))
    ) {
      throw new Error("PNG export: failed to paint sprite layer");
    }
    return await handle.toBlob();
  } finally {
    handle.cleanup();
  }
}

export async function exportCardPng(
  def: CreatureDef,
  emotion: Emotion,
  lore: LoreData | null,
  locale: SupportedLocale,
): Promise<Blob> {
  const handle = makeCanvas(CARD_WIDTH, CARD_HEIGHT);
  if (handle === null) {
    throw new Error("PNG export: canvas is unavailable in this environment");
  }
  try {
    handle.ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    await drawCard(handle.ctx, def, emotion, lore, locale);
    return await handle.toBlob();
  } finally {
    handle.cleanup();
  }
}
