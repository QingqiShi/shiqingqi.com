import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_RUN_MAX_MS, isRunLive } from "./is-run-live.ts";

const NOW = Date.parse("2026-11-02T10:00:00Z");
const startedAgo = (seconds: number) => NOW - seconds * 1000;

describe("isRunLive", () => {
  it("gives each task the time of its function", () => {
    expect(isRunLive("organise", startedAgo(299), NOW)).toBe(true);
    expect(isRunLive("organise", startedAgo(301), NOW)).toBe(false);
    expect(isRunLive("report", startedAgo(301), NOW)).toBe(true);
    expect(isRunLive("report", startedAgo(801), NOW)).toBe(false);
  });

  it.each([
    ["organise", "cron/organise"],
    ["report", "cron/morning-report"],
    ["report-preview", "report-preview"],
  ] as const)("matches the maxDuration of the %s route", (task, route) => {
    const source = readFileSync(
      path.join(import.meta.dirname, `../../app/api/${route}/route.ts`),
      "utf8",
    );
    expect(/export const maxDuration = (\d+);/.exec(source)?.[1]).toBe(
      String(AGENT_RUN_MAX_MS[task] / 1000),
    );
  });
});
