import { parseArgs } from "node:util";
import type { MediaMetadata } from "@tuja/tmdb-types/media-metadata";
import { Index } from "@upstash/vector";
import { config } from "dotenv";
import { getRequiredEnv } from "./get-required-env.ts";
import { RateLimiter } from "./rate-limiter.ts";
import { runFull } from "./run-full.ts";
import { runIncremental } from "./run-incremental.ts";
import { TmdbClient } from "./tmdb-client.ts";
import type { IngestStats } from "./types.ts";
import { writeSummary } from "./write-summary.ts";

config({ path: ".env.local" });

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      incremental: { type: "boolean", default: false },
      days: { type: "string", default: "1" },
      limit: { type: "string" },
    },
    strict: true,
  });

  const dryRun = values["dry-run"];
  const incremental = values.incremental;
  const days = parseInt(values.days, 10);
  const limit = values.limit ? parseInt(values.limit, 10) : undefined;

  if (Number.isNaN(days) || days < 1) {
    throw new Error(`Invalid --days value: ${values.days}`);
  }
  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    throw new Error(`Invalid --limit value: ${String(values.limit)}`);
  }

  const apiToken = getRequiredEnv("TMDB_API_TOKEN");

  const rateLimiter = new RateLimiter();
  const tmdb = new TmdbClient(apiToken, rateLimiter);

  const createIndex = () =>
    new Index<MediaMetadata>({
      url: getRequiredEnv("UPSTASH_VECTOR_REST_URL"),
      token: getRequiredEnv("UPSTASH_VECTOR_REST_TOKEN"),
    });

  let allStats: IngestStats[];
  if (incremental) {
    allStats = await runIncremental(tmdb, createIndex, days, dryRun, limit);
  } else {
    allStats = await runFull(tmdb, createIndex, dryRun, limit);
  }

  writeSummary(allStats);

  const hasErrors = allStats.some((s) => s.otherErrors > 0);
  if (hasErrors) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
