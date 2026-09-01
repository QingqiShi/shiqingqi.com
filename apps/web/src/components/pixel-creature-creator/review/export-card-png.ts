import type { SupportedLocale } from "#src/types.ts";
import { makeCanvas } from "#src/utils/make-canvas.ts";
import type { CreatureDef, Emotion } from "../state/creature-def-schema";
import type { LoreData } from "./creature-card";
import { CARD_HEIGHT, CARD_WIDTH, drawCard } from "./draw-card";

/**
 * Render a 960x1280 faux-Pokedex card - header band, sprite "screen", stat
 * bars, lore text. The caller gives the active app locale so the output
 * mirrors what the user saw on screen.
 */
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
