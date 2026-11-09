import type { Bucket, PetCopy } from "./types.ts";

export type LineContext = {
  streak: number;
  lost: number | null;
  level: string;
  total: string | null;
  today: string | null;
  hit: string | null;
  tokens: string | null;
  five: string | null;
  week: string | null;
  fullAt: string | null;
  reset: string | null;
  pr: string | null;
  time: string;
  /** How long ago the owner's Mac last uploaded. */
  ago: string | null;
  /** The waterings and pats on the owner's Macs and on the web page together. */
  fed: number;
  patted: number;
};

const PLACEHOLDER = /\{(\w+)\}/g;

/** The line with its placeholders filled, or null when the context lacks one of them. */
function fillLine(line: string, context: LineContext): string | null {
  const values: Record<string, string | number | null> = context;
  const isMissing = Array.from(line.matchAll(PLACEHOLDER)).some(
    ([, name]) => !(name in values) || values[name] === null,
  );
  if (isMissing) return null;

  return line.replace(PLACEHOLDER, (_, name: string) => String(values[name]));
}

export function linesFor(
  buckets: readonly Bucket[],
  context: LineContext,
  copy: PetCopy,
) {
  const out: { bucket: Bucket; text: string }[] = [];
  for (const bucket of buckets) {
    for (const line of copy.lines[bucket]) {
      const text = fillLine(line, context);
      if (text !== null) out.push({ bucket, text });
    }
  }

  return out;
}
