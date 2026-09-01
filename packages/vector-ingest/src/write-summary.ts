import { appendFileSync } from "node:fs";
import type { IngestStats } from "./types.ts";

export function writeSummary(allStats: IngestStats[]) {
  if (allStats.length === 0) return;

  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  const mdLines = summaryPath
    ? [
        "## Vector Ingestion Summary",
        "",
        "| Locale | Type | Total | Upserted | Deleted | Skipped | Errors |",
        "|--------|------|-------|----------|---------|---------|--------|",
      ]
    : undefined;

  console.log("\n=== Ingestion Summary ===");
  console.log("Locale | Type  | Total | Upserted | Deleted | Skipped | Errors");
  console.log("-------|-------|-------|----------|---------|---------|-------");

  for (const s of allStats) {
    console.log(
      `${s.locale.padEnd(6)} | ${s.mediaType.padEnd(5)} | ${String(s.total).padStart(5)} | ${String(s.upserted).padStart(8)} | ${String(s.deleted).padStart(7)} | ${String(s.skippedVoteCount).padStart(7)} | ${String(s.otherErrors).padStart(6)}`,
    );
    if (s.deleted > 0) {
      console.log(
        `::notice::${s.locale}/${s.mediaType}: deleted ${String(s.deleted)} stale vectors (TMDB 404)`,
      );
    }
    if (s.otherErrors > 0) {
      console.log(
        `::warning::${s.locale}/${s.mediaType}: ${String(s.otherErrors)} unexpected errors`,
      );
    }
    mdLines?.push(
      `| ${s.locale} | ${s.mediaType} | ${String(s.total)} | ${String(s.upserted)} | ${String(s.deleted)} | ${String(s.skippedVoteCount)} | ${String(s.otherErrors)} |`,
    );
  }

  if (summaryPath && mdLines) {
    mdLines.push("");
    appendFileSync(summaryPath, mdLines.join("\n"));
  }
}
