import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { invertOps } from "#src/trips/ops/invert-ops.ts";
import type { Op } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import type { ChangeResult } from "#src/trips/write-trips.ts";

/** One change that a person made: a batch of ops that applies whole. */
export interface Batch {
  id: number;
  ops: readonly DraftOp[];
  /**
   * The ops as they go to the server. Each `expect` is from the trip that
   * the person saw when they made the change, so the server can tell when
   * someone else changed the same thing since.
   */
  sent: readonly Op[];
  /** The ids of the days, moments and items that the batch changes, and `trip` for the trip's own fields. */
  touches: readonly string[];
}

export type Problem =
  /** The request failed, so the change is not saved. Sending it again is safe. */
  | { kind: "failed"; batch: Batch }
  /**
   * Someone else changed the same thing. `theirs` is the trip as the server
   * has it. `canKeepMine` is false when the thing is gone.
   */
  | { kind: "conflict"; batch: Batch; theirs: Trip; canKeepMine: boolean };

export interface QueueState {
  /** The trip with each change of the queue applied: what the screen shows. */
  trip: Trip;
  /** The changes that the server does not have yet, oldest first. */
  pending: readonly Batch[];
  /** Why the queue stopped. It waits for `retry`, `keepTheirs` or `keepMine`. */
  problem: Problem | null;
  /** Whether `undo` has a change to take back. */
  canUndo: boolean;
  /** The trip is gone, or the person is no longer a member of it. */
  isGone: boolean;
}

export interface SaveQueueOptions {
  trip: Trip;
  /** Sends a batch to the server. It throws when the request fails. */
  send: (ops: readonly Op[]) => Promise<ChangeResult>;
  /** The newest trip on the server, or null when the person cannot read it. It throws when the request fails. */
  read: () => Promise<Trip | null>;
}

export interface SaveQueue {
  getState: () => QueueState;
  subscribe: (listener: () => void) => () => void;
  /**
   * Calls the listener each time the queue drops changes, because the
   * server refused them or they no longer apply to the newer trip.
   */
  onDropped: (listener: () => void) => () => void;
  /**
   * Shows a change at once and puts it in the queue. When the change does
   * not apply to the trip that the screen shows, `refused` is why the trip
   * cannot take it, or null when the thing that it changes is gone.
   */
  submit: (
    ops: readonly DraftOp[],
  ) => { ok: true; batchId: number } | { ok: false; refused: string | null };
  /**
   * Takes back the newest change that is not taken back yet. False when
   * there is none, or when it no longer applies.
   */
  undo: () => boolean;
  /** Sends a change that failed again. */
  retry: () => void;
  /** Ends a conflict: drops the person's change and shows the other version. */
  keepTheirs: () => void;
  /** Ends a conflict: sends the person's change again, over the other version. */
  keepMine: () => void;
  /** Drops a change that failed, and each later change that then does not apply. */
  discard: () => void;
  /**
   * Reads the newest trip when no change waits, such as after the
   * connection comes back, so that the next change starts from it.
   */
  sync: () => void;
}

interface UndoEntry {
  batchId: number;
  inverse: readonly DraftOp[];
}

const UNDO_DEPTH = 20;

/**
 * The changes of one person to one trip, in order. Each change shows at
 * once, and goes to the server only after the change before it has an
 * answer. The trip of the last answer is the base, and the screen shows it
 * with the changes of the queue applied. A batch gets its `expect` one
 * time, when the person makes the change: a newer base never stamps it
 * again, because that would write over a change that the person did not
 * see. A request that fails, or a conflict, stops the queue until the
 * person decides.
 */
export function createSaveQueue(options: SaveQueueOptions): SaveQueue {
  const { send, read } = options;
  let base = options.trip;
  let pending: Batch[] = [];
  let sendingId: number | null = null;
  let isReading = false;
  let problem: Problem | null = null;
  let undoStack: UndoEntry[] = [];
  let isGone = false;
  let nextId = 1;
  let state: QueueState;
  const listeners = new Set<() => void>();
  const droppedListeners = new Set<() => void>();

  function reportDropped() {
    for (const listener of droppedListeners) listener();
  }

  /** The base with each batch applied in order. A batch that does not apply stops the list. */
  function project(from: Trip, batches: readonly Batch[]) {
    let trip = from;
    const kept: Batch[] = [];
    for (const batch of batches) {
      const result = applyOps(trip, withExpect(trip, batch.ops));
      if (result.status !== "applied") break;
      trip = result.trip;
      kept.push(batch);
    }
    return { trip, kept };
  }

  function publish() {
    const { trip } = project(base, pending);
    state = {
      trip,
      pending,
      problem,
      canUndo: undoStack.length > 0,
      isGone,
    };
    for (const listener of listeners) listener();
  }

  /** Keeps the batches that still apply to the base, and reports the rest. */
  function dropWhatNoLongerApplies() {
    const { kept } = project(base, pending);
    if (kept.length === pending.length) return;
    forget(pending.slice(kept.length));
    pending = kept;
    reportDropped();
  }

  /** Goes on after the base or the queue changed. */
  function resume() {
    dropWhatNoLongerApplies();
    publish();
    void pump();
  }

  /** A change that never reached the server has nothing to take back. */
  function forget(batches: readonly Batch[]) {
    const ids = new Set(batches.map((batch) => batch.id));
    undoStack = undoStack.filter((entry) => !ids.has(entry.batchId));
  }

  function dropHead() {
    forget(pending.slice(0, 1));
    pending = pending.slice(1);
  }

  function gone() {
    isGone = true;
    pending = [];
    problem = null;
    undoStack = [];
  }

  async function pump() {
    if (sendingId !== null || isReading || problem !== null || isGone) return;
    const head = pending.at(0);
    if (!head) return;
    sendingId = head.id;
    publish();
    let result: ChangeResult | null = null;
    try {
      result = await send(head.sent);
    } catch {
      problem = { kind: "failed", batch: head };
    }
    switch (result?.status) {
      case "applied":
        base = result.trip;
        pending = pending.slice(1);
        dropWhatNoLongerApplies();
        break;
      case "not_found":
        gone();
        break;
      case "refused":
        dropHead();
        reportDropped();
        await refresh();
        break;
      case "conflict":
        await conflict(head, result.expect !== null);
        break;
      case undefined:
        break;
    }
    // The queue stays busy until here. A change that the person makes
    // while a read is under way must not start a second request.
    sendingId = null;
    publish();
    void pump();
  }

  /** Reads the newest trip into the base. False when the read failed. */
  async function refresh(): Promise<boolean> {
    try {
      const newest = await read();
      if (newest === null) {
        gone();
        return true;
      }
      base = newest;
      dropWhatNoLongerApplies();
      return true;
    } catch {
      return false;
    }
  }

  async function conflict(head: Batch, canKeepMine: boolean) {
    let theirs: Trip | null;
    try {
      theirs = await read();
    } catch {
      problem = { kind: "failed", batch: head };
      return;
    }
    if (theirs === null) {
      gone();
      return;
    }
    problem = { kind: "conflict", batch: head, theirs, canKeepMine };
  }

  /**
   * A request that threw can have reached the server. Before the batch goes
   * again, read the trip: when it already holds the result of the batch, the
   * batch has landed. Else the batch goes again as it was, so the server
   * still finds a change that someone else made to the same thing.
   */
  async function retryAfterRead() {
    const head = pending.at(0);
    if (!head) return;
    sendingId = head.id;
    publish();
    let newest: Trip | null;
    try {
      newest = await read();
    } catch {
      sendingId = null;
      problem = { kind: "failed", batch: head };
      publish();
      return;
    }
    sendingId = null;
    if (newest === null) {
      gone();
      publish();
      return;
    }
    const expected = applyOps(base, head.sent);
    if (
      expected.status === "applied" &&
      hasLanded(head.ops, expected.trip, newest)
    ) {
      pending = pending.slice(1);
    }
    base = newest;
    resume();
  }

  /**
   * The person saw the other version of these things and chose their own
   * change. So each waiting op on them now expects the other version, with
   * the earlier changes of the queue applied.
   */
  function expectTheirs(ids: ReadonlySet<string>) {
    let trip = base;
    pending = pending.map((batch) => {
      const fresh = withExpect(trip, batch.ops);
      const result = applyOps(trip, fresh);
      if (result.status === "applied") trip = result.trip;
      return {
        ...batch,
        sent: batch.sent.map((op, index) =>
          touchedIds([batch.ops[index]]).some((id) => ids.has(id))
            ? fresh[index]
            : op,
        ),
      };
    });
  }

  function retry() {
    if (problem?.kind !== "failed") return;
    problem = null;
    void retryAfterRead();
  }

  function keepTheirs() {
    if (problem?.kind !== "conflict") return;
    base = problem.theirs;
    problem = null;
    dropHead();
    resume();
  }

  publish();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onDropped(listener) {
      droppedListeners.add(listener);
      return () => {
        droppedListeners.delete(listener);
      };
    },
    submit(ops) {
      if (isGone) return { ok: false, refused: null };
      const before = state.trip;
      const sent = withExpect(before, ops);
      const result = applyOps(before, sent);
      if (result.status === "refused") {
        return { ok: false, refused: result.reason };
      }
      if (result.status === "conflict") {
        return { ok: false, refused: null };
      }
      const batch: Batch = {
        id: nextId++,
        ops,
        sent,
        touches: touchedIds(ops),
      };
      pending = [...pending, batch];
      const inverse = invertOps(before, ops);
      if (inverse.length > 0) {
        undoStack = [...undoStack, { batchId: batch.id, inverse }].slice(
          -UNDO_DEPTH,
        );
      }
      publish();
      void pump();
      return { ok: true, batchId: batch.id };
    },
    undo() {
      const entry = undoStack.at(-1);
      if (!entry) return false;
      undoStack = undoStack.slice(0, -1);
      const last = pending.at(-1);
      if (last?.id === entry.batchId) {
        if (problem?.kind === "conflict" && problem.batch.id === last.id) {
          keepTheirs();
          return true;
        }
        // A change that has not left yet needs no request to take it back.
        if (sendingId !== last.id && problem?.batch.id !== last.id) {
          pending = pending.slice(0, -1);
          publish();
          return true;
        }
      }
      const sent = withExpect(state.trip, entry.inverse);
      if (applyOps(state.trip, sent).status !== "applied") {
        publish();
        return false;
      }
      pending = [
        ...pending,
        {
          id: nextId++,
          ops: entry.inverse,
          sent,
          touches: touchedIds(entry.inverse),
        },
      ];
      publish();
      // When the request of the change itself failed, it goes again first.
      if (problem?.kind === "failed") retry();
      else void pump();
      return true;
    },
    retry,
    keepTheirs,
    keepMine() {
      if (problem?.kind !== "conflict" || !problem.canKeepMine) return;
      base = problem.theirs;
      expectTheirs(new Set(problem.batch.touches));
      problem = null;
      resume();
    },
    discard() {
      if (problem?.kind !== "failed") return;
      problem = null;
      dropHead();
      resume();
    },
    sync() {
      if (sendingId !== null || isReading || problem !== null || isGone) return;
      if (pending.length > 0) return;
      isReading = true;
      void refresh().then(() => {
        isReading = false;
        publish();
        void pump();
      });
    },
  };
}

/**
 * Whether the newest trip holds what a batch makes: each thing that the
 * batch adds, changes or removes is in `newest` as it is in `expected`. A
 * move is not looked at, because a move that goes again does no harm.
 */
function hasLanded(ops: readonly DraftOp[], expected: Trip, newest: Trip) {
  const probes = ops.map(probeOf).filter((probe) => probe !== null);
  return (
    probes.length > 0 &&
    probes.every(
      (probe) => thingDigest(expected, probe) === thingDigest(newest, probe),
    )
  );
}

/** An op whose `expect` is the digest of the thing that `op` makes or changes. */
function probeOf(op: DraftOp): DraftOp | null {
  switch (op.op) {
    case "addDay":
      return { op: "removeDay", id: op.id };
    case "addMoment":
      return { op: "removeMoment", id: op.moment.id };
    case "addItem":
      return { op: "removeItem", id: op.item.id };
    case "moveDay":
    case "moveMoment":
    case "moveItem":
      return null;
    default:
      return op;
  }
}

function thingDigest(trip: Trip, probe: DraftOp) {
  const [stamped] = withExpect(trip, [probe]);
  return "expect" in stamped ? stamped.expect : undefined;
}

/** The ids of the things that a batch changes, for the state on their rows. */
function touchedIds(ops: readonly DraftOp[]): string[] {
  const ids = new Set<string>();
  for (const op of ops) {
    switch (op.op) {
      case "setTrip":
      case "setFirstDate":
        ids.add("trip");
        break;
      case "setStay":
      case "setPresence":
        ids.add(op.dayId);
        break;
      case "addMoment":
        ids.add(op.moment.id);
        break;
      case "addItem":
        ids.add(op.item.id);
        break;
      case "addDay":
      case "removeDay":
      case "moveDay":
      case "setDay":
      case "setMoment":
      case "moveMoment":
      case "removeMoment":
      case "setItem":
      case "moveItem":
      case "removeItem":
        ids.add(op.id);
        break;
    }
  }
  return [...ids];
}
