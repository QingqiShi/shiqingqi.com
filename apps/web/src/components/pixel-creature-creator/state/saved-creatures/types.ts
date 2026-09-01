import type { CreatureDef } from "../creature-def-schema";

export interface SavedCreature {
  id: string;
  def: CreatureDef;
  savedAt: number;
}
