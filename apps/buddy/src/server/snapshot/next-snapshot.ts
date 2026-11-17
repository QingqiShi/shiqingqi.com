import type { PetQuota } from "#src/pet/types.ts";
import type {
  ModelUsage,
  SnapshotDay,
  UploadBody,
} from "../upload/upload-body-schema.ts";
import type { MacSnapshot } from "./parse-snapshot.ts";

const QUOTA_SAMPLES_MS = 24 * 60 * 60 * 1000;

function maxOptional(a: number | undefined, b: number | undefined) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

function largerUsage(a: ModelUsage, b: ModelUsage): ModelUsage {
  return [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
    Math.max(a[4], b[4]),
    Math.max(a[5], b[5]),
  ];
}

/** Every model of both, so a later upload that leaves a model out, or sends no models, does not lose it. */
function mergeModels(
  stored: SnapshotDay["models"],
  incoming: SnapshotDay["models"],
): SnapshotDay["models"] {
  if (!stored) return incoming;
  if (!incoming) return stored;
  // A Map, because an object also answers a model id such as `constructor` with a property that it inherits.
  const merged = new Map(Object.entries(stored));
  for (const [model, usage] of Object.entries(incoming)) {
    const old = merged.get(model);
    merged.set(model, old ? largerUsage(old, usage) : usage);
  }
  return Object.fromEntries(merged);
}

function mergeDay(
  stored: SnapshotDay | undefined,
  incoming: SnapshotDay,
): SnapshotDay {
  if (!stored) return incoming;
  const cacheRead = maxOptional(stored.cacheRead, incoming.cacheRead);
  const promptTokens = maxOptional(stored.promptTokens, incoming.promptTokens);
  const models = mergeModels(stored.models, incoming.models);
  return {
    day: incoming.day,
    tokens: Math.max(stored.tokens, incoming.tokens),
    // The cost is the tokens at the Mac's prices of the time of the upload, so a price that the Mac corrects can lower it. An upload with fewer tokens lost a part of the day, and its cost is of that part only.
    costUsd:
      incoming.tokens >= stored.tokens ? incoming.costUsd : stored.costUsd,
    ...(cacheRead === undefined ? {} : { cacheRead }),
    ...(promptTokens === undefined ? {} : { promptTokens }),
    ...(models === undefined ? {} : { models }),
  };
}

/** Each day of both lists, each count the larger one, so a day never shrinks. Its cost goes with the upload that has the most tokens, the later one of two that have the same. */
function mergeDays(
  stored: readonly SnapshotDay[],
  incoming: readonly SnapshotDay[],
): SnapshotDay[] {
  const byDay = new Map<string, SnapshotDay>();
  for (const day of [...stored, ...incoming]) {
    byDay.set(day.day, mergeDay(byDay.get(day.day), day));
  }
  return [...byDay.values()].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
}

function earliest(a: string | null, b: string | null) {
  if (a === null) return b;
  if (b === null) return a;
  return a < b ? a : b;
}

function recentSamples(quota: PetQuota | null, now: number): PetQuota | null {
  if (!quota) return null;
  const from = now - QUOTA_SAMPLES_MS;
  return { ...quota, samples: quota.samples.filter((s) => s.at >= from) };
}

/** The snapshot after `upload`: its fields replace the old ones, and its days add to the old ones. */
export function nextSnapshot(
  previous: MacSnapshot | null,
  upload: UploadBody,
  receivedAt: number,
): MacSnapshot {
  return {
    ...upload,
    firstDay: earliest(previous?.firstDay ?? null, upload.firstDay),
    days: mergeDays(previous?.days ?? [], upload.days),
    quota: recentSamples(upload.quota, receivedAt),
    receivedAt,
  };
}
