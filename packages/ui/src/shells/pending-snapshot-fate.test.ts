import { describe, expect, it } from "vitest";
import { pendingSnapshotFate } from "./pending-snapshot-fate.ts";

const account = "https://qingqi.dev/finance?account=cash";
const household = "https://qingqi.dev/finance";

describe("pendingSnapshotFate", () => {
  it("plays the snapshot with the motion that lands at its URL", () => {
    expect(pendingSnapshotFate(account, account, true)).toBe("play");
  });

  it("drops the snapshot for a motion that lands at another URL", () => {
    expect(pendingSnapshotFate(account, household, true)).toBe("drop");
  });

  it("drops the snapshot where its URL commits with no motion", () => {
    expect(pendingSnapshotFate(account, account, false)).toBe("drop");
  });

  it("keeps the snapshot through a commit before its URL", () => {
    expect(pendingSnapshotFate(account, household, false)).toBe("keep");
  });
});
