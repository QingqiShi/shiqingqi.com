import { describe, expect, it } from "vitest";
import {
  planMailboxWrites,
  type WriteCandidate,
} from "./plan-mailbox-writes.ts";

const fresh: WriteCandidate = {
  bucket: "fyi",
  closed: false,
  shownInDigest: false,
  inInbox: true,
  categoryFolderPath: "Bills",
  seen: false,
  flagged: false,
};

describe("planMailboxWrites", () => {
  it("marks open act and unsure mail read and flagged, and leaves it in the inbox", () => {
    for (const bucket of ["act", "unsure"] as const) {
      expect(planMailboxWrites({ ...fresh, bucket })).toEqual({
        setSeen: true,
        setFlagged: true,
        clearFlagged: false,
        moveTo: null,
        final: false,
      });
    }
  });

  it("moves filed mail to its category folder at once, and fyi mail only after a digest showed it", () => {
    expect(planMailboxWrites({ ...fresh, bucket: "filed" })).toMatchObject({
      setSeen: true,
      setFlagged: false,
      moveTo: "Bills",
      final: true,
    });
    expect(planMailboxWrites(fresh)).toMatchObject({
      setSeen: true,
      moveTo: null,
      final: false,
    });
    expect(
      planMailboxWrites({ ...fresh, shownInDigest: true, seen: true }),
    ).toMatchObject({ setSeen: false, moveTo: "Bills", final: true });
  });

  it("clears the app's flag and moves closed mail, or only clears the flag when the category has no folder", () => {
    const closedAct = {
      ...fresh,
      bucket: "act" as const,
      closed: true,
      seen: true,
      flagged: true,
    };
    expect(planMailboxWrites(closedAct)).toEqual({
      setSeen: false,
      setFlagged: false,
      clearFlagged: true,
      moveTo: "Bills",
      final: true,
    });
    expect(
      planMailboxWrites({ ...closedAct, categoryFolderPath: null }),
    ).toEqual({
      setSeen: false,
      setFlagged: false,
      clearFlagged: true,
      moveTo: null,
      final: true,
    });
  });

  it("leaves filed mail without a category folder in the inbox, read", () => {
    expect(
      planMailboxWrites({
        ...fresh,
        bucket: "filed",
        categoryFolderPath: null,
      }),
    ).toMatchObject({ setSeen: true, moveTo: null, final: true });
  });

  it("moves mail only out of the inbox, and never clears a flag it did not set", () => {
    expect(
      planMailboxWrites({ ...fresh, bucket: "filed", inInbox: false }),
    ).toMatchObject({ moveTo: null, clearFlagged: false, final: true });
  });
});
