import { describe, expect, it } from "vitest";
import { selectHomeCard } from "./select-home-card.ts";
import type { HomeRun, HomeStatus } from "./types.ts";

const DUE = "2026-11-02T09:30:00.000Z";
const dueMs = Date.parse(DUE);

function statusWith(overrides: Partial<HomeStatus> = {}): HomeStatus {
  return {
    serverNow: DUE,
    run: null,
    nextOrganiseAt: DUE,
    unseenReportDate: null,
    localDate: "2026-11-02",
    ...overrides,
  };
}

function runOf(id: string, startedAt = "2026-11-02T09:29:00.000Z"): HomeRun {
  return {
    id,
    task: "organise",
    startedAt,
    progress: { inFlight: [], recent: [] },
  };
}

describe("selectHomeCard", () => {
  it("shows a live run before a countdown", () => {
    const card = selectHomeCard(
      statusWith({ run: runOf("a") }),
      dueMs - 60_000,
    );
    expect(card).toMatchObject({ kind: "running", elapsedMs: 0 });
  });

  it("drops a run older than its function can live, when polls stop", () => {
    const card = selectHomeCard(
      statusWith({ run: runOf("a", "2026-11-02T08:00:00.000Z") }),
      dueMs - 600_000,
    );
    expect(card).toEqual({ kind: "none" });
  });

  it("counts down only in the last 3 minutes", () => {
    const status = statusWith();
    expect(selectHomeCard(status, dueMs - 180_001)).toEqual({ kind: "none" });
    expect(selectHomeCard(status, dueMs - 180_000)).toEqual({
      kind: "countdown",
      remainingMs: 180_000,
    });
  });

  it("checks for 90 s from when the cron is due, with the old or the new due time", () => {
    const old = statusWith();
    const checking = { kind: "checking", endsAtMs: dueMs + 90_000 };
    expect(selectHomeCard(old, dueMs)).toEqual(checking);
    expect(selectHomeCard(old, dueMs + 89_999)).toEqual(checking);
    expect(selectHomeCard(old, dueMs + 90_000)).toEqual({ kind: "none" });

    const polled = statusWith({ nextOrganiseAt: "2026-11-02T10:00:00.000Z" });
    expect(selectHomeCard(polled, dueMs + 30_000)).toEqual(checking);
    expect(selectHomeCard(polled, dueMs + 90_000)).toEqual({ kind: "none" });
  });

  it("shows nothing when organising is off and no run lives", () => {
    const off = statusWith({ nextOrganiseAt: null });
    expect(selectHomeCard(off, dueMs)).toEqual({ kind: "none" });
  });
});
