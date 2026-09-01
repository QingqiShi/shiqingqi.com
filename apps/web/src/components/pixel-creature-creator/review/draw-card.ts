import type { SupportedLocale } from "#src/types.ts";
import type { Canvas2dContext } from "#src/utils/make-canvas.ts";
import { elements } from "../sprite/sprites";
import { computeSeedStats, STAT_KEYS } from "../state/compute-seed-stats";
import type { CreatureDef, Emotion } from "../state/creature-def-schema";
import type { LoreData } from "./creature-card";
import { hexToRgba } from "./hex-to-rgba";
import { paintCreature, SPRITE_EXPORT_PX } from "./paint-creature";

export const CARD_WIDTH = 960;
export const CARD_HEIGHT = 1280;

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
  const element = elements[def.type];
  const typeName = element === undefined ? def.type : element.label[locale];
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

function roundRectPath(ctx: Canvas2dContext, r: RoundRectArgs): void {
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

function wrapText(
  ctx: Canvas2dContext,
  text: string,
  maxWidth: number,
): string[] {
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

export async function drawCard(
  ctx: Canvas2dContext,
  def: CreatureDef,
  emotion: Emotion,
  lore: LoreData | null,
  locale: SupportedLocale,
): Promise<void> {
  const width = CARD_WIDTH;
  const height = CARD_HEIGHT;
  const element = elements[def.type];
  const accent = element?.accentColor ?? "#888888";
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
