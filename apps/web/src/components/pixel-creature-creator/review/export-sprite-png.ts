import { makeCanvas } from "#src/utils/make-canvas.ts";
import type { CreatureDef, Emotion } from "../state/creature-def-schema";
import { paintCreature, SPRITE_EXPORT_PX } from "./paint-creature";

/**
 * Composite the creature at scale 8 (336x336) with the same species and
 * accessory stacking as `<PixelSprite>`, but painted to a canvas at the
 * paused t=0 pose.
 */
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
