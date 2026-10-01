import type { CreatureDef } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";

export interface SavedCreature {
  id: string;
  def: CreatureDef;
  savedAt: number;
}
