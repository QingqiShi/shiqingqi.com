import { MIN_VOTE_COUNT } from "./constants.ts";
import { TmdbApiError } from "./tmdb-client.ts";
import { transformMovie } from "./transform-movie.ts";
import { transformTv } from "./transform-tv.ts";
import type { IngestStats, TmdbFetcher, VectorNamespace } from "./types.ts";
import type { VectorRecord } from "./vector-record.ts";

const UPSERT_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 100;
const CONCURRENCY = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertWithRetry(
  namespace: VectorNamespace,
  records: VectorRecord[],
): Promise<number> {
  try {
    await namespace.upsert(records);
    return records.length;
  } catch (firstError) {
    console.error(`    Upsert failed, retrying: ${String(firstError)}`);
    await sleep(1000);
    try {
      await namespace.upsert(records);
      return records.length;
    } catch (retryError) {
      console.error(
        `    Upsert retry failed, skipping batch of ${String(records.length)}: ${String(retryError)}`,
      );
      return 0;
    }
  }
}

export async function fetchAndUpsert(
  tmdb: Pick<TmdbFetcher, "fetchMovieDetail" | "fetchTvDetail">,
  ids: number[],
  mediaType: "movie" | "tv",
  locale: string,
  namespace: VectorNamespace,
  minVoteCount = MIN_VOTE_COUNT,
): Promise<IngestStats> {
  let processed = 0;
  let upserted = 0;
  let skippedVoteCount = 0;
  let notFoundErrors = 0;
  let otherErrors = 0;
  const batch: VectorRecord[] = [];
  const toDelete: string[] = [];

  // Process IDs with controlled concurrency
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const chunk = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (id) => {
        if (mediaType === "movie") {
          const detail = await tmdb.fetchMovieDetail(id, locale);
          if (detail.vote_count < minVoteCount) return null;
          return transformMovie(detail);
        }
        const detail = await tmdb.fetchTvDetail(id, locale);
        if (detail.vote_count < minVoteCount) return null;
        return transformTv(detail);
      }),
    );

    for (const [idx, result] of results.entries()) {
      processed++;
      if (result.status === "rejected") {
        const id = chunk[idx];
        if (
          result.reason instanceof TmdbApiError &&
          result.reason.statusCode === 404
        ) {
          notFoundErrors++;
          toDelete.push(`${mediaType}-${String(id)}`);
        } else {
          otherErrors++;
          if (otherErrors <= 10) {
            console.error(`    Error: ${String(result.reason)}`);
          }
        }
        continue;
      }
      if (result.value === null) {
        skippedVoteCount++;
        continue;
      }
      batch.push(result.value);
    }

    // Flush delete batch
    if (toDelete.length >= DELETE_BATCH_SIZE) {
      const idsToDelete = toDelete.splice(0);
      await namespace.delete(idsToDelete);
    }

    // Flush upsert batch when full
    if (batch.length >= UPSERT_BATCH_SIZE) {
      const toUpsert = batch.splice(0);
      const count = await upsertWithRetry(namespace, toUpsert);
      upserted += count;
      otherErrors += toUpsert.length - count;
    }

    // Progress logging
    if (processed % 500 === 0 || processed === ids.length) {
      console.log(
        `    Progress: ${String(processed)}/${String(ids.length)} processed, ${String(upserted + batch.length)} upserted, ${String(notFoundErrors)} deleted, ${String(skippedVoteCount)} skipped (low votes), ${String(otherErrors)} errors`,
      );
    }
  }

  // Flush remaining deletes
  if (toDelete.length > 0) {
    await namespace.delete(toDelete.splice(0));
  }

  // Flush remaining upserts
  if (batch.length > 0) {
    const toUpsert = batch.splice(0);
    const count = await upsertWithRetry(namespace, toUpsert);
    upserted += count;
    otherErrors += toUpsert.length - count;
  }

  console.log(
    `    Done: ${String(upserted)} upserted, ${String(notFoundErrors)} deleted, ${String(skippedVoteCount)} skipped, ${String(otherErrors)} errors`,
  );

  return {
    locale,
    mediaType,
    total: ids.length,
    upserted,
    deleted: notFoundErrors,
    skippedVoteCount,
    otherErrors,
  };
}
