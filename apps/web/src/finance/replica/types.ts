import type { Mutation } from "../sync/mutation-schema.ts";
import type {
  HouseholdRow,
  SyncRows,
  SyncTableName,
} from "../sync/row-schemas.ts";
import type { RejectionReason } from "../sync/types.ts";

/** One row of a synced table, in the wire shape. */
export type ReplicaRow<Table extends SyncTableName> = SyncRows[Table][number];

/** Every synced table as an immutable map from row key (see `rowKey`) to row. */
export type ReplicaTables = {
  readonly [Table in SyncTableName]: ReadonlyMap<string, ReplicaRow<Table>>;
};

/** Rows to write or remove per table, by row key. */
export type ReplicaTableWrites = {
  [Table in SyncTableName]?: {
    put: readonly ReplicaRow<Table>[];
    delete: readonly string[];
  };
};

export interface ReplicaMeta {
  householdId: string;
  /** This device's id for the server's idempotency check. */
  clientId: string;
  /** The server clock the stored rows reach. */
  clock: number;
  /** A whole bootstrap is on disk. */
  bootstrapped: boolean;
  household: HouseholdRow | null;
  /** The first Transaction day the bootstrap sent, or null for every one. */
  transactionsFrom: string | null;
  lastSyncedAt: string | null;
}

/** A mutation in the Outbox, waiting to be pushed. */
export interface OutboxEntry {
  mutation: Mutation;
  /** Order of creation on this device. */
  seq: number;
  createdAt: string;
  /** The server applied it; it stays until a pull brings the server's rows. */
  acknowledged?: boolean;
}

export interface PersistedReplica {
  meta: ReplicaMeta | null;
  tables: ReplicaTables;
  outbox: OutboxEntry[];
}

/** One atomic write to the store on disk. `clearTables` runs first. */
export interface ReplicaWrite {
  clearTables?: boolean;
  tables?: ReplicaTableWrites;
  meta?: ReplicaMeta;
  outboxPut?: readonly OutboxEntry[];
  outboxDelete?: readonly string[];
}

/** Where the Replica keeps its server rows and its Outbox between visits. */
export interface ReplicaPersistence {
  load: () => Promise<PersistedReplica>;
  loadOutbox: () => Promise<OutboxEntry[]>;
  /** Starts the write before it returns when it can, so that an unload right after the call does not lose it. */
  write: (batch: ReplicaWrite) => Promise<void>;
  close: () => void;
}

/** The rows one snapshot changed against the one before it, per table. */
export type ReplicaChanges = {
  [Table in SyncTableName]?: {
    from: ReadonlyMap<string, ReplicaRow<Table>>;
    keys: ReadonlySet<string>;
  };
};

/**
 * What the UI reads: the server rows with every unconfirmed local mutation
 * applied on top. A new object on every change; unchanged tables keep their
 * map, so a selector can memoise on the map.
 */
export interface ReplicaSnapshot {
  household: HouseholdRow | null;
  tables: ReplicaTables;
  /** `<table>:<row key>` of every row a local mutation changed that no pull has confirmed yet. */
  pendingKeys: ReadonlySet<string>;
  /** Accounts whose balances local mutations changed, with the first day they change. */
  pendingAccounts: ReadonlyMap<string, string>;
  /** Mutations not pushed yet. */
  outboxCount: number;
  /** The Replica has loaded from disk. */
  loaded: boolean;
  /** The Replica holds a whole bootstrap. Before that, show skeletons. */
  bootstrapped: boolean;
  changes: ReplicaChanges;
}

export interface ReplicaRejection {
  mutation: Mutation;
  reason: RejectionReason;
  message?: string;
}

export type SyncProblem =
  | "offline"
  | "server"
  /** The server asked us to slow down (429); the loop waits as it asked. */
  | "busy"
  | "unauthorised"
  | "not-configured"
  | "storage";

/** The Outbox writes this tab has not finished on disk. */
export interface ReplicaStorageState {
  /** Mutations shown on screen whose Outbox write has not committed. */
  unsaved: number;
  /** The last write to disk failed; a reload can lose the unsaved mutations. */
  failed: boolean;
}

export interface SyncStatus {
  online: boolean;
  /** What the sync loop does now. */
  activity: "idle" | "bootstrapping" | "pulling" | "pushing";
  /** Mutations not pushed yet. */
  pendingCount: number;
  lastSyncedAt: string | null;
  /** Why the last run could not download; null when it could. */
  problem: SyncProblem | null;
  /** Failed downloads in a row; 0 after a run that worked. */
  failures: number;
  /** Why the last run could not send the Outbox, while the download may still work; null once a push works. */
  pushProblem: SyncProblem | null;
  /** Failed pushes in a row. */
  pushFailures: number;
  /** True when this tab runs the network loop; other tabs follow it. */
  leader: boolean;
}
