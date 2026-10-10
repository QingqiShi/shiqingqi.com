import type { ReplicaRow, ReplicaSnapshot } from "../replica/types.ts";
import type { SyncTableName } from "../sync/row-schemas.ts";

function compareRows(a: object, b: object) {
  const positionA =
    "position" in a && typeof a.position === "number" ? a.position : 0;
  const positionB =
    "position" in b && typeof b.position === "number" ? b.position : 0;
  if (positionA !== positionB) return positionA - positionB;
  const nameA = "name" in a && typeof a.name === "string" ? a.name : "";
  const nameB = "name" in b && typeof b.name === "string" ? b.name : "";
  return nameA.localeCompare(nameB);
}

function isLive(row: object) {
  return !("deletedAt" in row) || row.deletedAt === null;
}

function liveRowsOf<Table extends SyncTableName>(table: Table) {
  const cache = new WeakMap<
    ReadonlyMap<string, ReplicaRow<Table>>,
    readonly ReplicaRow<Table>[]
  >();
  return (snapshot: ReplicaSnapshot): readonly ReplicaRow<Table>[] => {
    const rows = snapshot.tables[table];
    const cached = cache.get(rows);
    if (cached) return cached;
    const live = [...rows.values()].filter(isLive).sort(compareRows);
    cache.set(rows, live);
    return live;
  };
}

/**
 * The rows of a small table that are not deleted, by `position` then
 * `name`. Each result is the same array until its table changes.
 */
export const liveRowSelectors = {
  members: liveRowsOf("members"),
  accountGroups: liveRowsOf("accountGroups"),
  accounts: liveRowsOf("accounts"),
  categories: liveRowsOf("categories"),
  payees: liveRowsOf("payees"),
  tags: liveRowsOf("tags"),
  rules: liveRowsOf("rules"),
  bankLinks: liveRowsOf("bankLinks"),
  reports: liveRowsOf("reports"),
};
