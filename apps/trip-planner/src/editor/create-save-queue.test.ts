import { describe, expect, it } from "vitest";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import type { Op } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import type { ChangeResult } from "#src/trips/write-trips.ts";
import { locateItem } from "./build-outline.ts";
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

/** A server that applies each batch with the real `applyOps`, and answers when the test lets it. */
function setup() {
  const sent: (readonly Op[])[] = [];
  const server = { trip: start, sent };
  const gates: (() => void)[] = [];
  let failures = 0;
  let landsBeforeFailure = false;
  const dropped = { count: 0 };

  const queue = createSaveQueue({
    trip: start,
    async send(ops) {
      server.sent.push(ops);
      await new Promise<void>((resolve) => gates.push(resolve));
      const fails = failures > 0;
      if (fails) failures--;
      if (fails && !landsBeforeFailure) throw new Error("offline");
      const result = applyOps(server.trip, ops);
      if (result.status === "applied") server.trip = result.trip;
      if (fails) throw new Error("the answer was lost");
      return (
        result.status === "applied" ? { ...result, revision: 1 } : result
      ) satisfies ChangeResult;
    },
    read: () => Promise.resolve(server.trip),
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
    // The later change was to the same thing, so it goes to the server on
    // top of their version.
    expect(nameOf(server.trip)).toBe("My castle, again");
    expect(dropped.count).toBe(0);
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
    expect(dropped.count).toBe(1);
  });

  it("takes back a saved change with a new request, and a waiting change with none", async () => {
    const { queue, server, answer } = setup();
    queue.submit([rename("Fort")]);
    await answer();
    expect(queue.getState().canUndo).toBe(true);

    expect(queue.undo()).toBe(true);
    expect(nameOf(queue.getState().trip)).toBe("Castle");
    await answer();
    expect(nameOf(server.trip)).toBe("Castle");
    expect(server.sent).toHaveLength(2);
    expect(queue.getState().canUndo).toBe(false);

    queue.submit([rename("Keep")]);
    queue.submit([rename("Tower")]);
    expect(queue.undo()).toBe(true);
    expect(nameOf(queue.getState().trip)).toBe("Keep");
    await answer();
    expect(server.sent).toHaveLength(3);
    expect(nameOf(server.trip)).toBe("Keep");
  });
});
