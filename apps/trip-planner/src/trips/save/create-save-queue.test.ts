import { describe, expect, it } from "vitest";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { findItem as locateItem } from "#src/trips/ops/find-item.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import type { Op } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import type { ChangeResult } from "#src/trips/write-trips.ts";
import { createSaveQueue } from "./create-save-queue.ts";

function applied(trip: Trip, ops: readonly DraftOp[]): Trip {
  const result = applyOps(trip, withExpect(trip, ops));
  if (result.status !== "applied") throw new Error(JSON.stringify(result));
  return result.trip;
}

const empty = newTrip({
  title: "Test trip",
  firstDate: "2027-04-16",
  days: 2,
  timeZone: "Europe/Lisbon",
  language: "en",
});
const [dayOne] = empty.days;
const start = applied(empty, [
  {
    op: "addItem",
    to: { dayId: dayOne.id, list: "places" },
    item: { id: "castle", type: "place", name: "Castle" },
  },
]);

const rename = (name: string): DraftOp => ({
  op: "setItem",
  id: "castle",
  fields: { name },
});
const nameOf = (trip: Trip) => {
  const item = locateItem(trip, "castle")?.item;
  return item && "name" in item ? item.name : null;
};

/**
 * A server that makes digests in a different way than the editor does, as
 * after a deploy that changes them: it knows a digest only with a mark in
 * front, and its answers carry digests with that mark.
 */
function applyWithOtherDigests(trip: Trip, ops: readonly Op[]) {
  const result = applyOps(
    trip,
    ops.map((op) =>
      "expect" in op
        ? {
            ...op,
            expect: op.expect.startsWith("new:") ? op.expect.slice(4) : "-",
          }
        : op,
    ),
  );
  return result.status === "conflict" && result.expect !== null
    ? { ...result, expect: `new:${result.expect}` }
    : result;
}

/** A server that applies each batch with the real `applyOps`, and answers when the test lets it. */
function setup(options: { hasOtherDigests?: boolean } = {}) {
  const apply = options.hasOtherDigests ? applyWithOtherDigests : applyOps;
  const sent: (readonly Op[])[] = [];
  const server = { trip: start, sent };
  const gates: (() => void)[] = [];
  let failures = 0;
  let landsBeforeFailure = false;
  let readFails = false;
  const dropped = { count: 0 };

  const queue = createSaveQueue({
    trip: start,
    async send(ops) {
      server.sent.push(ops);
      await new Promise<void>((resolve) => gates.push(resolve));
      const fails = failures > 0;
      if (fails) failures--;
      if (fails && !landsBeforeFailure) throw new Error("offline");
      const result = apply(server.trip, ops);
      if (result.status === "applied") server.trip = result.trip;
      if (fails) throw new Error("the answer was lost");
      return (
        result.status === "applied" ? { ...result, revision: 1 } : result
      ) satisfies ChangeResult;
    },
    read: () => {
      if (readFails) {
        readFails = false;
        return Promise.reject(new Error("offline"));
      }
      return Promise.resolve(server.trip);
    },
  });
  queue.onDropped(() => {
    dropped.count++;
  });

  return {
    queue,
    server,
    dropped,
    /** Lets the request that waits get its answer, and the queue act on it. */
    answer: async () => {
      await new Promise((resolve) => setTimeout(resolve));
      gates.shift()?.();
      await new Promise((resolve) => setTimeout(resolve));
    },
    failNext: (options: { lands: boolean }) => {
      failures = 1;
      landsBeforeFailure = options.lands;
    },
    failNextRead: () => {
      readFails = true;
    },
    /** A change by another person, straight on the server. */
    other: (ops: readonly DraftOp[]) => {
      server.trip = applied(server.trip, ops);
    },
  };
}

describe("the save queue", () => {
  it("shows each change at once, and sends the second only after the first has its answer", async () => {
    const { queue, server, answer } = setup();
    queue.submit([rename("Castle of St George")]);
    queue.submit([rename("São Jorge Castle")]);

    expect(nameOf(queue.getState().trip)).toBe("São Jorge Castle");
    expect(server.sent).toHaveLength(1);

    await answer();
    expect(server.sent).toHaveLength(2);
    await answer();

    // The second change expects the castle as the first change left it, so
    // the server takes it with no conflict.
    expect(nameOf(server.trip)).toBe("São Jorge Castle");
    expect(queue.getState().pending).toHaveLength(0);
    expect(queue.getState().problem).toBeNull();
  });

  it("keeps a change that did not reach the server, and sends it again on a retry", async () => {
    const { queue, server, answer, failNext } = setup();
    failNext({ lands: false });
    queue.submit([rename("Fort")]);
    queue.submit([rename("Old fort")]);
    await answer();

    expect(queue.getState().problem?.kind).toBe("failed");
    expect(nameOf(queue.getState().trip)).toBe("Old fort");
    expect(nameOf(server.trip)).toBe("Castle");

    queue.retry();
    await answer();
    await answer();
    expect(nameOf(server.trip)).toBe("Old fort");
    expect(queue.getState().pending).toHaveLength(0);
  });

  it("does not send a change again when it reached the server and only the answer was lost", async () => {
    const { queue, server, answer, failNext } = setup();
    failNext({ lands: true });
    queue.submit([
      {
        op: "addItem",
        to: { dayId: dayOne.id, list: "places" },
        item: { id: "tower", type: "place", name: "Tower" },
      },
    ]);
    await answer();
    expect(queue.getState().problem?.kind).toBe("failed");

    queue.retry();
    await answer();
    expect(server.sent).toHaveLength(1);
    expect(queue.getState().pending).toHaveLength(0);
    expect(queue.getState().problem).toBeNull();
    expect(locateItem(queue.getState().trip, "tower")).toBeDefined();
  });

  it("stops on a change that another person also made, and keeps their version when asked", async () => {
    const { queue, server, answer, other, dropped } = setup();
    other([rename("Their castle")]);
    queue.submit([rename("My castle")]);
    queue.submit([rename("My castle, again")]);
    await answer();

    const { problem } = queue.getState();
    expect(problem).toMatchObject({ kind: "conflict", canKeepMine: true });
    expect(problem?.kind === "conflict" && nameOf(problem.theirs)).toBe(
      "Their castle",
    );

    queue.keepTheirs();
    await answer();
    // The person made the later change before they saw the other version.
    // It goes with the first, so the person gets one question, not two.
    expect(nameOf(server.trip)).toBe("Their castle");
    expect(nameOf(queue.getState().trip)).toBe("Their castle");
    expect(queue.getState().problem).toBeNull();
    expect(queue.getState().pending).toHaveLength(0);
    expect(server.sent).toHaveLength(1);
    expect(dropped.count).toBe(0);
  });

  it("asks on a retry, and does not write over the other change, when the read after a conflict failed", async () => {
    const { queue, server, answer, other, failNextRead } = setup();
    other([rename("Their castle")]);
    queue.submit([rename("My castle")]);
    failNextRead();
    await answer();
    expect(queue.getState().problem?.kind).toBe("failed");

    queue.retry();
    await answer();
    expect(nameOf(server.trip)).toBe("Their castle");
    expect(queue.getState().problem).toMatchObject({
      kind: "conflict",
      canKeepMine: true,
    });
  });

  it("sends the person's change over the other version when asked", async () => {
    const { queue, server, answer, other } = setup();
    other([{ op: "setItem", id: "castle", fields: { note: "Their note" } }]);
    queue.submit([rename("My castle")]);
    await answer();
    expect(queue.getState().problem?.kind).toBe("conflict");

    queue.keepMine();
    await answer();
    expect(locateItem(server.trip, "castle")?.item).toMatchObject({
      name: "My castle",
      note: "Their note",
    });
    expect(queue.getState().problem).toBeNull();
  });

  it("sends the person's change with the digest of the server's answer, so a server with other digests takes it", async () => {
    const { queue, server, answer } = setup({ hasOtherDigests: true });
    queue.submit([rename("My castle")]);
    await answer();
    expect(queue.getState().problem).toMatchObject({
      kind: "conflict",
      canKeepMine: true,
    });

    queue.keepMine();
    await answer();
    expect(nameOf(server.trip)).toBe("My castle");
    expect(queue.getState().problem).toBeNull();
    expect(queue.getState().pending).toHaveLength(0);
  });

  it("offers only their version when the thing is gone, and drops the changes that need it", async () => {
    const { queue, answer, other, dropped } = setup();
    other([{ op: "removeItem", id: "castle" }]);
    queue.submit([rename("My castle")]);
    queue.submit([rename("My castle, again")]);
    await answer();

    expect(queue.getState().problem).toMatchObject({
      kind: "conflict",
      canKeepMine: false,
    });
    queue.keepMine();
    expect(queue.getState().problem?.kind).toBe("conflict");

    queue.keepTheirs();
    expect(queue.getState().pending).toHaveLength(0);
    expect(locateItem(queue.getState().trip, "castle")).toBeUndefined();
    // The sheet said that the change cannot be saved. The later change to
    // the same thing goes with it, with no second message.
    expect(dropped.count).toBe(0);
  });

  it("takes back a saved change with a new request, and a waiting change with none", async () => {
    const { queue, server, answer } = setup();
    queue.submit([rename("Fort")]);
    await answer();
    expect(queue.getState().canUndo).toBe(true);

    expect(queue.undo()).toBe("taken");
    expect(nameOf(queue.getState().trip)).toBe("Castle");
    await answer();
    expect(nameOf(server.trip)).toBe("Castle");
    expect(server.sent).toHaveLength(2);
    expect(queue.getState().canUndo).toBe(false);

    queue.submit([rename("Keep")]);
    queue.submit([rename("Tower")]);
    expect(queue.undo()).toBe("taken");
    expect(nameOf(queue.getState().trip)).toBe("Keep");
    await answer();
    expect(server.sent).toHaveLength(3);
    expect(nameOf(server.trip)).toBe("Keep");
  });

  it("does not take out what another person added to a new thing when the person takes the thing back", async () => {
    const { queue, server, answer, other } = setup();
    const hasTea = (trip: Trip) => locateItem(trip, "tea") !== undefined;
    queue.submit([
      {
        op: "addMoment",
        dayId: dayOne.id,
        moment: { id: "break", time: "16:00", text: "Break" },
      },
    ]);
    await answer();
    other([
      {
        op: "addItem",
        to: { momentId: "break" },
        item: { id: "tea", type: "place", name: "Tea room" },
      },
    ]);
    // The editor has the addition of the other person before the undo.
    queue.sync();
    await answer();
    expect(hasTea(queue.getState().trip)).toBe(true);

    // The queue knows that the note changed, so it does not say "taken".
    expect(queue.undo()).toBe("asks");
    await answer();
    expect(hasTea(server.trip)).toBe(true);
    const { problem } = queue.getState();
    expect(problem).toMatchObject({ kind: "conflict", canKeepMine: true });

    queue.keepTheirs();
    await answer();
    expect(hasTea(server.trip)).toBe(true);
    expect(hasTea(queue.getState().trip)).toBe(true);
    expect(queue.getState().problem).toBeNull();
  });

  it("says that a change is taken back only after the person keeps an undo that had to ask", async () => {
    const { queue, server, answer, other } = setup();
    const takenBack = new Set<number>();
    queue.onTakenBack((ids) => {
      for (const id of ids) takenBack.add(id);
    });
    const change = queue.submit([rename("Fort")]);
    if (!change.ok) throw new Error("The queue refused the change.");
    await answer();
    other([{ op: "setItem", id: "castle", fields: { note: "Their note" } }]);
    queue.sync();
    await answer();

    expect(queue.undo()).toBe("asks");
    await answer();
    expect(queue.getState().problem?.kind).toBe("conflict");
    expect(takenBack.has(change.batchId)).toBe(false);

    queue.keepMine();
    await answer();
    expect(nameOf(server.trip)).toBe("Castle");
    expect(takenBack.has(change.batchId)).toBe(true);
  });

  it("says that a change is taken back when such an undo reached the server and only the answer was lost", async () => {
    const { queue, server, answer, other, failNext } = setup();
    const takenBack = new Set<number>();
    queue.onTakenBack((ids) => {
      for (const id of ids) takenBack.add(id);
    });
    const change = queue.submit([rename("Fort")]);
    if (!change.ok) throw new Error("The queue refused the change.");
    await answer();
    other([{ op: "setItem", id: "castle", fields: { note: "Their note" } }]);
    queue.sync();
    await answer();
    expect(queue.undo()).toBe("asks");
    await answer();

    failNext({ lands: true });
    queue.keepMine();
    await answer();
    expect(queue.getState().problem?.kind).toBe("failed");
    expect(takenBack.has(change.batchId)).toBe(false);

    queue.retry();
    await answer();
    expect(nameOf(server.trip)).toBe("Castle");
    expect(queue.getState().pending).toHaveLength(0);
    expect(takenBack.has(change.batchId)).toBe(true);
  });

  it("does not put back the older version of a field that another person changed after the person", async () => {
    const { queue, server, answer, other } = setup();
    const weatherOf = (trip: Trip) => trip.days[0].weather;
    queue.submit([
      {
        op: "setDay",
        id: dayOne.id,
        fields: { weather: { temp: "18°", summary: "Sun" } },
      },
    ]);
    await answer();
    other([
      {
        op: "setDay",
        id: dayOne.id,
        fields: { weather: { temp: "18°", summary: "Sun", note: "Windy" } },
      },
    ]);
    queue.sync();
    await answer();

    queue.undo();
    await answer();
    expect(weatherOf(server.trip)?.note).toBe("Windy");
    expect(queue.getState().problem?.kind).toBe("conflict");
  });

  it("tells the person when a change to a different thing goes with the version that they give up", async () => {
    const { queue, server, answer, other, dropped } = setup();
    const titleOf = (trip: Trip) => trip.days[0].title;
    other([rename("Their castle")]);
    queue.submit([rename("My castle")]);
    // One change of the person, to the castle and to the day.
    queue.submit([
      rename("My castle, again"),
      { op: "setDay", id: dayOne.id, fields: { title: "Old town" } },
    ]);
    expect(titleOf(queue.getState().trip)).toBe("Old town");
    await answer();
    expect(queue.getState().problem?.kind).toBe("conflict");

    queue.keepTheirs();
    await answer();
    expect(nameOf(server.trip)).toBe("Their castle");
    expect(titleOf(server.trip)).not.toBe("Old town");
    expect(titleOf(queue.getState().trip)).not.toBe("Old town");
    expect(queue.getState().pending).toHaveLength(0);
    expect(queue.getState().canUndo).toBe(false);
    expect(dropped.count).toBe(1);
  });

  it("does not put back a thing that another person removed when the person takes their own removal back", async () => {
    const { queue, server, answer, other } = setup();
    other([{ op: "removeItem", id: "castle" }]);
    queue.submit([{ op: "removeItem", id: "castle" }]);
    // The removal is on its way, so the undo waits behind it as a change
    // of its own.
    expect(queue.undo()).toBe("taken");
    expect(queue.getState().pending).toHaveLength(2);
    await answer();
    expect(queue.getState().problem?.kind).toBe("conflict");

    queue.keepTheirs();
    await answer();
    expect(locateItem(server.trip, "castle")).toBeUndefined();
    expect(locateItem(queue.getState().trip, "castle")).toBeUndefined();
    expect(queue.getState().pending).toHaveLength(0);
    expect(server.sent).toHaveLength(1);
  });
});
