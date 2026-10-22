import { describe, expect, it } from "vitest";
import {
  selectUnbackedEntries,
  type BackingRow,
} from "./select-unbacked-entries.ts";

function entry(id: string, date: string) {
  return { id, transactionId: `tx-${id}`, date };
}

function matched(id: string, date: string): BackingRow {
  return { date, state: "matched", transactionId: `tx-${id}` };
}

function select(
  entries: ReturnType<typeof entry>[],
  bankRows: BackingRow[],
  keptTransactionIds: string[] = [],
) {
  return selectUnbackedEntries(entries, bankRows, keptTransactionIds).map(
    (row) => row.id,
  );
}

describe("selectUnbackedEntries", () => {
  it("leaves out each Entry whose Transaction a matched bank row backs", () => {
    expect(
      select(
        [entry("a", "2026-10-01"), entry("b", "2026-10-02")],
        [matched("a", "2026-10-01")],
      ),
    ).toEqual(["b"]);
  });

  it("keeps a duplicate: a second Transaction for the bank row that backs the first", () => {
    expect(
      select(
        [entry("a", "2026-10-03"), entry("copy", "2026-10-03")],
        [matched("a", "2026-10-03")],
      ),
    ).toEqual(["copy"]);
  });

  it("keeps an Entry whose bank row the bank stopped returning", () => {
    expect(
      select(
        [entry("a", "2026-10-03")],
        [{ date: "2026-10-03", state: "missing", transactionId: "tx-a" }],
      ),
    ).toEqual(["a"]);
  });

  it("leaves out each Entry whose Transaction a Member kept", () => {
    expect(
      select(
        [entry("kept", "2026-10-02"), entry("b", "2026-10-03")],
        [matched("x", "2026-10-01")],
        ["tx-kept"],
      ),
    ).toEqual(["b"]);
  });

  it("lists oldest first", () => {
    expect(
      select(
        [entry("new", "2026-10-05"), entry("old", "2026-10-02")],
        [matched("x", "2026-10-01")],
      ),
    ).toEqual(["old", "new"]);
  });

  it("leaves out Entries older than the link's first bank row", () => {
    expect(
      select(
        [entry("old", "2026-09-30"), entry("new", "2026-10-01")],
        [matched("x", "2026-10-01")],
      ),
    ).toEqual(["new"]);
  });

  it("finds none when the link has no bank rows", () => {
    expect(select([entry("a", "2026-10-01")], [])).toEqual([]);
  });
});
