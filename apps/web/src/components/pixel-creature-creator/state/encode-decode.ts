import {
  type CreatureDef,
  creatureDefSchema,
  emotionSchema,
} from "./creature-schema";

/**
 * Compact array encoding to keep base64 short. Field order is part of the
 * wire format — never reorder. New fields must append (and bump `v`).
 *
 * v:2 layout: [v, species, accessories, type, defaultEmotion, name].
 * v:1 (the legacy multi-axis format) is no longer accepted; old share URLs
 * fail at `creatureDefSchema.safeParse` and `decodeCreature` returns null.
 */
type CompactTuple = [
  v: number,
  species: string,
  accessories: string[],
  type: string,
  defaultEmotion: string,
  name: string,
];

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

function fromCompact(tuple: unknown): CreatureDef | null {
  if (!Array.isArray(tuple) || tuple.length !== 6) return null;
  const tupleAsUnknown: unknown[] = tuple;
  const v = tupleAsUnknown[0];
  const species = tupleAsUnknown[1];
  const accessories = tupleAsUnknown[2];
  const type = tupleAsUnknown[3];
  const emotion = tupleAsUnknown[4];
  const name = tupleAsUnknown[5];

  if (
    typeof species !== "string" ||
    typeof type !== "string" ||
    typeof emotion !== "string" ||
    typeof name !== "string" ||
    !Array.isArray(accessories) ||
    !accessories.every((a: unknown): a is string => typeof a === "string")
  ) {
    return null;
  }

  const emotionParse = emotionSchema.safeParse(emotion);
  if (!emotionParse.success) return null;

  const candidate = {
    v,
    species,
    accessories,
    type,
    defaultEmotion: emotionParse.data,
    name,
  };
  const result = creatureDefSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

function base64ToBase64Url(b64: string): string {
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBase64(b64u: string): string {
  const replaced = b64u.replaceAll("-", "+").replaceAll("_", "/");
  const pad = replaced.length % 4;
  return pad === 0 ? replaced : replaced + "=".repeat(4 - pad);
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

// Strict base64url alphabet (no padding, no whitespace). `atob` is lenient
// about whitespace, so we pre-validate to make bogus input fail loudly.
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function decodeCreature(encoded: string): CreatureDef | null {
  if (typeof encoded !== "string" || encoded.length === 0) return null;
  if (!BASE64URL_PATTERN.test(encoded)) return null;
  let json: string;
  try {
    const binary = atob(base64UrlToBase64(encoded));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return fromCompact(parsed);
}
