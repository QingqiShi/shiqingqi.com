import type { CompactTuple } from "./compact-tuple";
import type { CreatureDef } from "./creature-def-schema";

function toCompact(def: CreatureDef): CompactTuple {
  return [
    def.v,
    def.species,
    [...def.accessories],
    def.type,
    def.defaultEmotion,
    def.name,
  ];
}

function base64ToBase64Url(b64: string): string {
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function encodeCreature(def: CreatureDef): string {
  const compact = toCompact(def);
  const json = JSON.stringify(compact);
  // `btoa` only handles Latin-1; encode UTF-8 bytes first so non-ASCII names
  // (Chinese characters etc.) survive the round trip.
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return base64ToBase64Url(btoa(binary));
}
