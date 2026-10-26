import type { ReplicaRow } from "../replica/types.ts";
import type { LabelledBy, WriteActor } from "../sync/labelled-by-after.ts";
import type { Mutation, MutationName } from "../sync/mutation-schema.ts";
import type { SyncTableName } from "../sync/row-schemas.ts";

/**
 * The rows a mutation reads and writes, in the wire shape. The Replica gives
 * every row it holds; the server gives only the rows it loaded for the
 * mutation and throws on a read of any other.
 */
export interface MutationDraft {
  get<Table extends SyncTableName>(
    table: Table,
    key: string,
  ): ReplicaRow<Table> | undefined;
  /** Every row whose fields equal those of `match`, deleted ones included. */
  where<Table extends SyncTableName>(
    table: Table,
    match: Partial<ReplicaRow<Table>>,
  ): ReplicaRow<Table>[];
  /** True when a row that is not deleted has the fields of `match`. */
  hasLive<Table extends SyncTableName>(
    table: Table,
    match: Partial<ReplicaRow<Table>>,
  ): boolean;
  /** The account's balance at the end of `day`, from the posted Entries and the Valuations. */
  balanceAt(accountId: string, day: string): number;
  /** The version of the cached icon of `domain`, null when it has none, undefined when the draft cannot tell. */
  institutionIconVersion(domain: string): string | null | undefined;
  /** True when a row of `table` that the draft does not hold can still exist. */
  mayLack(table: SyncTableName): boolean;
  put<Table extends SyncTableName>(
    table: Table,
    key: string,
    row: ReplicaRow<Table>,
  ): void;
}

/** Who decided the labels of a Transaction the server creates, and why. */
export interface Provenance {
  labelledBy: LabelledBy;
  aiReason: string | null;
  source: "manual" | "bank";
}

export interface MutationContext {
  householdId: string;
  /** ISO timestamp written into `createdAt`, `updatedAt`, `deletedAt`, `archivedAt` and `pausedAt`. */
  now: string;
  /** Today in the Household's time zone. */
  today: string;
  actor: WriteActor;
  /** Undefined when it is not known. */
  baseCurrency: string | undefined;
  /** The labels of a Transaction that the server creates; a Member's Transaction is always labelled by the Member. */
  provenance?: Provenance;
}

/** One mutation as it runs. */
export interface MutationScope {
  draft: MutationDraft;
  context: MutationContext;
  /** Account id → first day whose balance may change. */
  touched: Map<string, string>;
}

export type MutationArgs<Name extends MutationName> = Extract<
  Mutation,
  { name: Name }
>["args"];
