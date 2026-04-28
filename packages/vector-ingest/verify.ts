import type { MediaMetadata } from "@repo/tmdb-types/vector-db";
import { Index } from "@upstash/vector";
import { config } from "dotenv";
import { LOCALES, getRequiredEnv } from "./constants.ts";

config({ path: ".env.local" });

const SAMPLE_QUERIES = [
  "sci-fi time travel",
  "Korean thriller",
  "animated family adventure",
  "romantic comedy in New York",
  "space exploration documentary",
  "historical war drama",
  "superhero origin story",
  "Japanese anime fantasy",
];

const TOP_K = 5;

async function main() {
  const index = new Index<MediaMetadata>({
    url: getRequiredEnv("UPSTASH_VECTOR_REST_URL"),
    token: getRequiredEnv("UPSTASH_VECTOR_REST_TOKEN"),
  });

  for (const locale of LOCALES) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Locale: ${locale}`);
    console.log("=".repeat(60));

    const ns = index.namespace(locale);

    for (const query of SAMPLE_QUERIES) {
      console.log(`\nQuery: "${query}"`);
      console.log("-".repeat(40));

      const results = await ns.query<MediaMetadata>({
        data: query,
        topK: TOP_K,
        includeMetadata: true,
      });

      if (results.length === 0) {
        console.log("  (no results)");
        continue;
      }

      for (const result of results) {
        const meta = result.metadata;
        if (!meta) continue;
        console.log(
          `  [${result.score.toFixed(3)}] ${meta.title} (${String(meta.releaseYear)}) - ${meta.mediaType}`,
        );
      }
    }
  }

  console.log("\nVerification complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
