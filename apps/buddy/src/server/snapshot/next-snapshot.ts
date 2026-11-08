import type { PetDay, PetQuota } from "#src/pet/types.ts";
import type { UploadBody } from "../upload/upload-body-schema.ts";
import type { MacSnapshot } from "./parse-snapshot.ts";

const QUOTA_SAMPLES_MS = 24 * 60 * 60 * 1000;

function maxOptional(a: number | undefined, b: number | undefined) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

function mergeDay(stored: PetDay | undefined, incoming: PetDay): PetDay {
  if (!stored) return incoming;
  const cacheRead = maxOptional(stored.cacheRead, incoming.cacheRead);
  const promptTokens = maxOptional(stored.promptTokens, incoming.promptTokens);
  return {
    day: incoming.day,
    tokens: Math.max(stored.tokens, incoming.tokens),
    costUsd: Math.max(stored.costUsd, incoming.costUsd),
    ...(cacheRead === undefined ? {} : { cacheRead }),
    ...(promptTokens === undefined ? {} : { promptTokens }),
  };
}

/** Each day of both lists, each count the larger one, so a day never shrinks. */
function mergeDays(
  stored: readonly PetDay[],
  incoming: readonly PetDay[],
): PetDay[] {
  const byDay = new Map<string, PetDay>();
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
