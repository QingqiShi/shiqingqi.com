import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import {
  exchangeRateKey,
  type ExchangeRateRow,
  type ExchangeRatesResponse,
} from "../exchange-rates/exchange-rate-row-schema.ts";
import {
  mutationSchema,
  type Mutation,
  type MutationInput,
} from "../sync/mutation-schema.ts";
import { REPLICA_ROW_SHAPE } from "../sync/replica-row-shape.ts";
import {
  SYNC_TABLE_NAMES,
  type HouseholdRow,
  type SyncRows,
  type SyncTableName,
} from "../sync/row-schemas.ts";
import type { PushResponse } from "../sync/types.ts";
import type { LocalMutationContext } from "./apply-local-mutation.ts";
import { applyLocalMutation } from "./apply-local-mutation.ts";
import { createOutboxQueue } from "./create-outbox-queue.ts";
import { createReplicaView } from "./create-replica-view.ts";
import { createReplicaWriter } from "./create-replica-writer.ts";
import {
  createTablesDraft,
  type ChangedKeys,
  type TablesDraft,
} from "./create-tables-draft.ts";
import { emptyReplicaTables } from "./empty-replica-tables.ts";
import { mergeServerRows, writesOf } from "./merge-server-rows.ts";
import { replayOutbox } from "./replay-outbox.ts";
import type {
  OutboxEntry,
  PersistedReplica,
  ReplicaExchangeRates,
  ReplicaMeta,
  ReplicaPersistence,
  ReplicaRejection,
  ReplicaTables,
} from "./types.ts";

/** A mutation as a caller writes it; the store gives it an id when it has none. */
export type LocalMutationInput = MutationInput extends infer Input
  ? Input extends { id: string }
    ? Omit<Input, "id"> & { id?: string }
    : never
  : never;

interface ReplicaStoreOptions {
  householdId: string;
  persistence: ReplicaPersistence;
  now?: () => Date;
  createId?: () => string;
}

/** Meta whose rows have an old shape must bootstrap again. */
function withCurrentRowShape(meta: ReplicaMeta): ReplicaMeta {
  return meta.rowShape === REPLICA_ROW_SHAPE
    ? meta
    : { ...meta, clock: 0, bootstrapped: false };
}

/**
 * The Replica: the server rows on disk and in memory, the Outbox, and the
 * view the UI reads — the server rows with every unconfirmed mutation on
 * top. A mutation stays in the view after the server applies it, until a
 * pull brings the server's own rows, so nothing flickers.
 */
export function createReplicaStore(options: ReplicaStoreOptions) {
  const { householdId, persistence } = options;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());

  let meta: ReplicaMeta = {
    householdId,
    clientId: createId(),
    clock: 0,
    bootstrapped: false,
    rowShape: REPLICA_ROW_SHAPE,
    household: null,
    lastSyncedAt: null,
    exchangeRateCursor: null,
  };
  let base: ReplicaTables = emptyReplicaTables();
  let exchangeRates: ReplicaExchangeRates = new Map();
  const writer = createReplicaWriter(persistence, (exchangeRateCursor) => {
    meta = { ...meta, exchangeRateCursor };
  });
  const { persist } = writer;
  const outbox = createOutboxQueue(writer);
  const view = createReplicaView(base, exchangeRates);
  let loaded = false;
  /** The server rows of the bootstrap now running, shown only when it finishes. */
  let bootstrapDraft: TablesDraft | null = null;
  const localListeners = new Set<() => void>();
  const rejectionListeners = new Set<(rejection: ReplicaRejection) => void>();

  function contextOf(entry: OutboxEntry): LocalMutationContext {
    const timezone = meta.household?.timezone ?? "UTC";
    return {
      householdId,
      now: entry.createdAt,
      today: todayInTimeZone(timezone, new Date(entry.createdAt)),
      baseCurrency: meta.household?.baseCurrency,
    };
  }

  function rebuildView(baseChanged: ChangedKeys) {
    const replay = replayOutbox(base, outbox.entries(), contextOf);
    if (replay.failed.length > 0) {
      const failed = new Set(
        replay.failed.map(({ entry }) => entry.mutation.id),
      );
      outbox.dropFailed(failed);
    }
    view.publishRebuild(replay, baseChanged, {
      household: meta.household,
      exchangeRates,
      outboxCount: outbox.queuedCount(),
      loaded,
      bootstrapped: meta.bootstrapped,
    });
  }

  /** Takes in what is on disk, with this tab's Outbox writes that have not committed on top. */
  function adopt(persisted: PersistedReplica) {
    const previous = base;
    base = persisted.tables;
    exchangeRates = persisted.exchangeRates;
    outbox.adopt(persisted.outbox);
    const changed: ChangedKeys = new Map();
    for (const table of SYNC_TABLE_NAMES) {
      if (previous[table] === base[table]) continue;
      const keys = new Set<string>(previous[table].keys());
      for (const key of base[table].keys()) keys.add(key);
      changed.set(table, keys);
    }
    rebuildView(changed);
  }

  return {
    async load() {
      const persisted = await persistence.load();
      if (persisted.meta) {
        meta = withCurrentRowShape(persisted.meta);
        writer.setCursorOnDisk(meta.exchangeRateCursor ?? null);
      } else {
        void persist({ meta });
      }
      loaded = true;
      adopt(persisted);
    },

    /** Reads the disk again; a tab that does not sync calls it when the syncing tab wrote. Keeps the view when the disk can not be read. */
    async reload() {
      let persisted: PersistedReplica;
      try {
        persisted = await persistence.load();
      } catch {
        writer.markRowsFailed();
        return;
      }
      if (persisted.meta) {
        meta = withCurrentRowShape(persisted.meta);
        writer.setCursorOnDisk(meta.exchangeRateCursor ?? null);
      }
      adopt(persisted);
    },

    getSnapshot: view.getSnapshot,

    getServerSnapshot: view.getServerSnapshot,

    subscribe: view.subscribe,

    getMeta(): ReplicaMeta {
      return meta;
    },

    getDiskRevision: writer.getDiskRevision,

    /**
     * Checks a mutation, shows its result at once, and puts it in the
     * Outbox. Throws a `ZodError` for a malformed mutation and a
     * `MutationError` for one the server would reject; neither changes
     * anything. A mutation that only the server can decide goes in the
     * Outbox and shows once the server answers.
     */
    applyLocal(input: LocalMutationInput): Mutation {
      const mutation = mutationSchema.parse({
        ...input,
        id: input.id ?? createId(),
      });
      const entry = outbox.createEntry(mutation, now());
      const { tables, changed, accounts } = applyLocalMutation(
        view.getSnapshot().tables,
        mutation,
        contextOf(entry),
      );
      void outbox.enqueue(entry).then(() => {
        for (const listener of localListeners) listener();
      });

      view.publishLocal({ tables, changed, accounts }, outbox.queuedCount());
      return mutation;
    },

    /** Adds mutations another tab wrote to the Outbox on disk. */
    async mergeOutboxFromDisk() {
      const known = outbox.knownIds();
      let stored: OutboxEntry[];
      try {
        stored = await persistence.loadOutbox();
      } catch {
        return;
      }
      if (!outbox.addFromDisk(stored, known)) return;
      rebuildView(new Map());
    },

    /** Runs `listener` once the Outbox write of a local mutation has settled, e.g. to push it. */
    onLocalMutation(listener: () => void) {
      localListeners.add(listener);
      return () => {
        localListeners.delete(listener);
      };
    },

    onRejection(listener: (rejection: ReplicaRejection) => void) {
      rejectionListeners.add(listener);
      return () => {
        rejectionListeners.delete(listener);
      };
    },

    getStorageState: writer.getStorageState,

    subscribeStorage: writer.subscribeStorage,

    flush: writer.flush,

    takeOutbox: outbox.takeOutbox,

    releaseOutbox: outbox.releaseOutbox,

    hasQueued: outbox.hasQueued,

    awaitingIds: outbox.awaitingIds,

    /** Takes in a push response. A rejected mutation leaves the view at once. */
    acknowledge(sent: readonly string[], response: PushResponse) {
      const rejections = outbox.acknowledge(sent, response);
      if (rejections.length > 0) {
        rebuildView(new Map());
        for (const rejection of rejections) {
          for (const listener of rejectionListeners) listener(rejection);
        }
      } else {
        view.publishPatch({ outboxCount: outbox.queuedCount() });
      }
    },

    /** Takes in a pull and confirms `confirmed` (from `awaitingIds` before the pull). */
    applyPull(
      pull: {
        clock: number;
        household: HouseholdRow;
        tables: Partial<SyncRows>;
      },
      confirmed: ReadonlySet<string>,
    ) {
      const draft = createTablesDraft(base);
      mergeServerRows(draft, pull.tables);
      const result = draft.finish();
      base = result.tables;
      const clockMoved = pull.clock !== meta.clock;
      meta = {
        ...meta,
        clock: pull.clock,
        household: pull.household,
        lastSyncedAt: now().toISOString(),
      };
      const removed = outbox.confirm(confirmed);
      void persist(
        {
          tables: writesOf(draft, result.changed),
          meta,
          outboxDelete: removed,
        },
        {
          forOtherTabs:
            clockMoved || result.changed.size > 0 || removed.length > 0,
        },
      );
      rebuildView(result.changed);
    },

    /** Drops every server row before a bootstrap; the Outbox stays. */
    startBootstrap(household: HouseholdRow) {
      const draft = createTablesDraft(base);
      draft.clear();
      const result = draft.finish();
      base = result.tables;
      meta = {
        ...meta,
        clock: 0,
        bootstrapped: false,
        household,
      };
      void persist({ clearTables: true, meta }, { startsOver: true });
      rebuildView(result.changed);
      bootstrapDraft = createTablesDraft(base);
    },

    /** Writes the rows to disk; the view shows them when the bootstrap finishes. */
    applyBootstrapRows(table: SyncTableName, rows: SyncRows[SyncTableName]) {
      bootstrapDraft ??= createTablesDraft(base);
      const tables: Partial<SyncRows> = {};
      Object.assign(tables, { [table]: rows });
      const changed = mergeServerRows(bootstrapDraft, tables);
      void persist({ tables: writesOf(bootstrapDraft, changed) });
    },

    finishBootstrap(clock: number, confirmed: ReadonlySet<string>) {
      const { tables, changed } = (
        bootstrapDraft ?? createTablesDraft(base)
      ).finish();
      bootstrapDraft = null;
      base = tables;
      meta = {
        ...meta,
        clock,
        bootstrapped: true,
        rowShape: REPLICA_ROW_SHAPE,
        lastSyncedAt: now().toISOString(),
      };
      void persist({ meta, outboxDelete: outbox.confirm(confirmed) });
      rebuildView(changed);
    },

    /**
     * Takes in an exchange rate download. The cursor for the next download
     * moves only once the rates are on disk; until then the next download
     * asks for them again.
     */
    applyExchangeRates(response: ExchangeRatesResponse) {
      const { cursor } = response;
      if (!response.replace && response.rates.length === 0) {
        if (cursor === meta.exchangeRateCursor) return;
        void persist(
          { meta },
          { forOtherTabs: false, exchangeRateCursor: cursor },
        );
        return;
      }
      const next = new Map<string, ExchangeRateRow>(
        response.replace ? [] : exchangeRates,
      );
      for (const rate of response.rates) next.set(exchangeRateKey(rate), rate);
      exchangeRates = next;
      void persist(
        {
          exchangeRates: { replace: response.replace, put: response.rates },
          meta,
        },
        { exchangeRateCursor: cursor },
      );
      view.publishPatch({ exchangeRates });
    },

    /** The server's clock went backwards: forget the rows so the next sync bootstraps. */
    requireBootstrap() {
      meta = { ...meta, clock: 0, bootstrapped: false };
      void persist({ meta });
    },

    close() {
      persistence.close();
    },
  };
}

export type ReplicaStore = ReturnType<typeof createReplicaStore>;
