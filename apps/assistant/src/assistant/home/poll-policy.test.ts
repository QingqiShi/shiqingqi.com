import { describe, expect, it } from "vitest";
import { pollDelayMs } from "./poll-delay-ms.ts";
import { refreshAfterPoll } from "./refresh-after-poll.ts";
import type { HomeRun, HomeStatus } from "./types.ts";

const DUE = "2026-11-02T09:15:00.000Z";
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

function runOf(id: string, startedAt = "2026-11-02T09:14:00.000Z"): HomeRun {
  return {
    id,
    task: "organise",
    startedAt,
    progress: { inFlight: [], recent: [] },
  };
}

describe("pollDelayMs", () => {
  it("wakes when the countdown starts, not up to a minute after", () => {
    expect(pollDelayMs(statusWith(), dueMs - 190_000)).toBe(10_000);
    expect(pollDelayMs(statusWith(), dueMs - 600_000)).toBe(60_000);
  });
});

describe("refreshAfterPoll", () => {
  function poll(
    view: "report" | "today",
    next: Partial<HomeStatus> = {},
    previous: HomeRun | null = null,
    done: string[] = [],
  ) {
    return refreshAfterPoll({
      view,
      renderedDate: "2026-11-02",
      previous,
      next: statusWith(next),
      done: new Set(done),
    });
  }

  it("never replaces the report being read, whatever a poll sees", () => {
    expect(poll("report", { run: runOf("b") }, runOf("a"))).toBeNull();
    expect(poll("report", { unseenReportDate: "2026-11-02" })).toBeNull();
    expect(poll("report", { localDate: "2026-11-03" })).toBeNull();
  });

  it("refreshes the today view once for a report that is new to the owner", () => {
    const next = { unseenReportDate: "2026-11-02" };
    const key = poll("today", next);
    expect(key).not.toBeNull();
    expect(poll("today", next, null, [key ?? ""])).toBeNull();
  });

  it("refreshes the today view when the local day changed", () => {
    expect(poll("today", { localDate: "2026-11-03" })).not.toBeNull();
    expect(poll("today", { localDate: "2026-11-02" })).toBeNull();
  });

  it("refreshes the today view when a run ends, also when the next has started", () => {
    expect(poll("today", {}, runOf("a"))).not.toBeNull();
    expect(poll("today", { run: runOf("b") }, runOf("a"))).not.toBeNull();
  });

  it("leaves the today view alone while the same run goes on or none ran", () => {
    expect(poll("today", { run: runOf("a") }, runOf("a"))).toBeNull();
    expect(poll("today")).toBeNull();
    expect(poll("today", { run: runOf("a") })).toBeNull();
  });
});
