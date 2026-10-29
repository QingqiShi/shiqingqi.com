import type {
  DraftTableName,
  LiveTableName,
} from "../db/repositories/draft-row-repository.ts";
import type { ReplicaRow } from "../replica/types.ts";

/**
 * One read of the `MutationDraft` that a mutation makes, named after the
 * draft method it serves. The server loads every Read before the mutation
 * runs, and the strict draft throws on a read that no Read declared.
 */
export type Read =
  | {
      kind: "get";
      table: DraftTableName;
      keys: readonly (string | null | undefined)[];
    }
  | {
      kind: "where";
      table: DraftTableName;
      match: Partial<ReplicaRow<DraftTableName>>;
    }
  | {
      kind: "hasLive";
      table: LiveTableName;
      match: Readonly<Record<string, unknown>>;
    }
  | { kind: "balanceAt"; accountId: string; day: string }
  | {
      kind: "institutionIconVersion";
      domains: readonly (string | null | undefined)[];
    };

export const read = {
  /** The rows with these keys; a null or undefined key reads nothing. */
  get: (
    table: DraftTableName,
    keys: readonly (string | null | undefined)[],
  ): Read => ({
    kind: "get",
    table,
    keys,
  }),
  /** Every row whose fields equal those of `match`, deleted ones included. */
  where: <Table extends DraftTableName>(
    table: Table,
    match: Partial<ReplicaRow<Table>>,
  ): Read => ({ kind: "where", table, match }),
  hasLive: <Table extends LiveTableName>(
    table: Table,
    match: Partial<ReplicaRow<Table>>,
  ): Read => ({ kind: "hasLive", table, match }),
  balanceAt: (accountId: string, day: string): Read => ({
    kind: "balanceAt",
    accountId,
    day,
  }),
  /** The cached icon version of each domain; a null or undefined domain reads nothing. */
  institutionIconVersion: (
    domains: readonly (string | null | undefined)[],
  ): Read => ({ kind: "institutionIconVersion", domains }),
};
