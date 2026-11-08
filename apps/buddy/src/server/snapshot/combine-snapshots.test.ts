import { describe, expect, it } from "vitest";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import type { UploadBody } from "../upload/upload-body-schema.ts";
import { combineSnapshots } from "./combine-snapshots.ts";
import type { MacSnapshot } from "./parse-snapshot.ts";

function snapshot(
  overrides: Partial<UploadBody> & { receivedAt?: number } = {},
): MacSnapshot {
  const { receivedAt = 0, ...upload } = overrides;
  return { ...sampleUpload(upload), receivedAt };
}

const quota = (pct: number, at: number | null) => ({
  at,
  five: { pct, resetsAt: null },
  week: null,
  samples: [],
});

const github = (total: number, fetchedAt: number) => ({
  fetchedAt,
  total,
  start: "2026-01-04",
  levels: "",
});

describe("combineSnapshots", () => {
  it("sums each day over the Macs, and an optional count only when every Mac has it", () => {
    const state = combineSnapshots("qingqi", [
      snapshot({
        days: [
          { day: "2026-11-06", tokens: 100, costUsd: 1, cacheRead: 7 },
          { day: "2026-11-07", tokens: 10, costUsd: 2, cacheRead: 1 },
        ],
      }),
      snapshot({
        days: [{ day: "2026-11-07", tokens: 5, costUsd: 0.5 }],
      }),
    ]);
    expect(state.days).toEqual([
      { day: "2026-11-06", tokens: 100, costUsd: 1, cacheRead: 7 },
      { day: "2026-11-07", tokens: 15, costUsd: 2.5 },
    ]);
  });

  it("takes each account field from the Mac that saw it last, and a Mac without it has no say", () => {
    const older = snapshot({
      at: 1_000,
      receivedAt: 1_100,
      tzOffsetMin: 60,
      quota: quota(40, 900),
      github: github(5, 2_000),
      merges: { from: "2026-11-01", days: [] },
      growth: { highest: 4, levelUp: { level: 4, until: 9_000 } },
      pet: { fed: 3, patted: 50 },
      firstDay: "2026-09-30",
    });
    const newer = snapshot({
      at: 3_000,
      receivedAt: 3_100,
      tzOffsetMin: -300,
      quota: quota(10, null),
      github: github(9, 1_000),
      merges: null,
      growth: { highest: 2, levelUp: null },
      pet: { fed: 8, patted: 1 },
      firstDay: "2026-10-02",
    });
    const state = combineSnapshots("qingqi", [older, newer]);
    expect(state).toMatchObject({
      updatedAt: 3_100,
      tzOffsetMin: -300,
      firstDay: "2026-09-30",
      quota: { five: { pct: 10 } },
      github: { total: 5 },
      merges: { from: "2026-11-01" },
      growth: { highest: 4, levelUp: { level: 4 } },
      pet: { fed: 8, patted: 50 },
    });
  });

  it("uses the quota's own time over the snapshot's", () => {
    const state = combineSnapshots("qingqi", [
      snapshot({ at: 5_000, quota: quota(10, 1_000) }),
      snapshot({ at: 2_000, quota: quota(70, 2_000) }),
    ]);
    expect(state.quota?.five?.pct).toBe(70);
  });

  it("reads no Mac as an empty pet", () => {
    expect(combineSnapshots("qingqi", [])).toMatchObject({
      updatedAt: null,
      days: [],
      quota: null,
      growth: { highest: null, levelUp: null },
      pet: { fed: 0, patted: 0 },
    });
  });
});
