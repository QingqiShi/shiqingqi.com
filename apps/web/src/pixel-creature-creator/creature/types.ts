/**
 * Compact array encoding to keep base64 short. Field order is part of the
 * wire format — never reorder. New fields must append (and bump `v`).
 *
 * v:2 layout: [v, species, accessories, type, defaultEmotion, name].
 * v:1 (the legacy multi-axis format) is no longer accepted; old share URLs
 * fail at `creatureDefSchema.safeParse` and `decodeCreature` returns null.
 */
export type CompactTuple = [
  v: number,
  species: string,
  accessories: string[],
  type: string,
  defaultEmotion: string,
  name: string,
];
