import type { Mutation } from "../sync/mutation-schema.ts";
import type { PushResponse } from "../sync/types.ts";
import type { ReplicaWriter } from "./create-replica-writer.ts";
import type { OutboxEntry, ReplicaRejection } from "./types.ts";

function bySeq(a: OutboxEntry, b: OutboxEntry) {
  return a.seq - b.seq;
}

export function createOutboxQueue(writer: ReplicaWriter) {
  /** Not acknowledged by the server yet. */
  let queued: OutboxEntry[] = [];
  /** Sent in the push now running. */
  const inFlight = new Set<string>();
  /** Applied by the server, kept in the view (and on disk) until a pull confirms them. */
  let awaiting: OutboxEntry[] = [];
  let lastSeq = 0;

  return {
    createEntry(mutation: Mutation, time: Date): OutboxEntry {
      lastSeq = Math.max(lastSeq + 1, time.getTime());
      return {
        mutation,
        seq: lastSeq,
        createdAt: time.toISOString(),
      };
    },

    enqueue(entry: OutboxEntry) {
      queued.push(entry);
      writer.markUnsaved(entry.mutation.id, entry);
      return writer.saveUnsavedOutbox();
    },

    entries() {
      return [...awaiting, ...queued];
    },

    queuedCount() {
      return queued.length;
    },

    knownIds() {
      return new Set(
        [...queued, ...awaiting].map((entry) => entry.mutation.id),
      );
    },

    addFromDisk(
      stored: readonly OutboxEntry[],
      knownBeforeRead: ReadonlySet<string>,
    ) {
      const added = stored.filter(
        (entry) =>
          !entry.acknowledged &&
          !knownBeforeRead.has(entry.mutation.id) &&
          !writer.unsavedOutbox().has(entry.mutation.id),
      );
      if (added.length === 0) return false;
      queued = [...queued, ...added].sort(bySeq);
      lastSeq = Math.max(lastSeq, queued.at(-1)?.seq ?? 0);
      return true;
    },

    adopt(persisted: readonly OutboxEntry[]) {
      const outbox = new Map(
        persisted.map((entry) => [entry.mutation.id, entry]),
      );
      for (const [id, wanted] of writer.unsavedOutbox()) {
        if (wanted) outbox.set(id, wanted);
        else outbox.delete(id);
      }
      const entries = [...outbox.values()].sort(bySeq);
      queued = entries.filter((entry) => !entry.acknowledged);
      awaiting = entries.filter((entry) => entry.acknowledged);
      lastSeq = Math.max(lastSeq, entries.at(-1)?.seq ?? 0);
    },

    dropFailed(failed: ReadonlySet<string>) {
      const dropped = awaiting
        .map((entry) => entry.mutation.id)
        .filter((id) => failed.has(id));
      awaiting = awaiting.filter((entry) => !failed.has(entry.mutation.id));
      if (dropped.length > 0) void writer.forgetOutbox(dropped);
    },

    /** Drops the confirmed mutations from the view and returns their ids, to remove from disk with the rows that confirm them. */
    confirm(confirmed: ReadonlySet<string>) {
      const removed = awaiting
        .map((entry) => entry.mutation.id)
        .filter((id) => confirmed.has(id));
      awaiting = awaiting.filter((entry) => !confirmed.has(entry.mutation.id));
      const pending = removed.filter((id) => writer.unsavedOutbox().has(id));
      if (pending.length > 0) void writer.forgetOutbox(pending);
      return removed;
    },

    /** Takes up to `limit` queued mutations for a push. */
    takeOutbox: (limit = 500): Mutation[] => {
      const taken = queued
        .filter((entry) => !inFlight.has(entry.mutation.id))
        .slice(0, limit);
      for (const entry of taken) inFlight.add(entry.mutation.id);
      return taken.map((entry) => entry.mutation);
    },

    /** Puts mutations of a failed push back in the queue. */
    releaseOutbox: (mutationIds: readonly string[]) => {
      for (const id of mutationIds) inFlight.delete(id);
    },

    hasQueued: () => {
      return queued.some((entry) => !inFlight.has(entry.mutation.id));
    },

    /** Mutations the server applied that a pull starting now confirms. */
    awaitingIds: (): ReadonlySet<string> => {
      return new Set(awaiting.map((entry) => entry.mutation.id));
    },

    acknowledge(sent: readonly string[], response: PushResponse) {
      const applied = new Set(response.applied);
      const rejected = new Map(response.rejected.map((r) => [r.id, r]));
      for (const id of sent) inFlight.delete(id);
      const done: string[] = [];
      const rejections: ReplicaRejection[] = [];
      const stillQueued: OutboxEntry[] = [];
      for (const entry of queued) {
        const id = entry.mutation.id;
        if (applied.has(id)) {
          const acknowledged = { ...entry, acknowledged: true };
          awaiting.push(acknowledged);
          writer.markUnsaved(id, acknowledged);
          done.push(id);
        } else if (rejected.has(id)) {
          const rejection = rejected.get(id);
          writer.markUnsaved(id, null);
          done.push(id);
          if (rejection) {
            rejections.push({
              mutation: entry.mutation,
              reason: rejection.reason,
              message: rejection.message,
            });
          }
        } else {
          stillQueued.push(entry);
        }
      }
      queued = stillQueued;
      if (done.length > 0) void writer.saveOutbox(done);
      return rejections;
    },
  };
}
