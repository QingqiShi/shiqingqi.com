import { z } from "zod";
import type { ReplicaStore } from "./create-replica-store.ts";

const RELOADS_KEY = "finance-reloads-for-row-shape";
const MAX_RELOADS = 3;
const FIRST_RELOAD_GAP_MS = 30_000;

const reloadRecordSchema = z.object({
  rowShape: z.number(),
  count: z.number(),
  at: z.number(),
});

type ReloadRecord = z.infer<typeof reloadRecordSchema>;

interface ReloadDependencies {
  /** A getter, because the `sessionStorage` property itself can throw. */
  storage: () => Pick<Storage, "getItem" | "setItem">;
  /** Gets the newer code and reloads, unless `confirm` then says no. Resolves whether it reloads. */
  reload: (confirm: () => boolean) => Promise<boolean>;
  isHidden: () => boolean;
  /** A reload loses a Replica that is only in memory, Outbox included. */
  inMemory: () => boolean;
  now: () => number;
}

export interface ReloadOutcome {
  reloaded: boolean;
  /** When to try again; absent when only the next trigger can help. */
  retryInMs?: number;
}

/** The reloads so far; undefined when the storage cannot say. */
function readRecord(
  dependencies: ReloadDependencies,
): ReloadRecord | null | undefined {
  try {
    const stored = dependencies.storage().getItem(RELOADS_KEY);
    if (stored === null) return null;
    const parsed = reloadRecordSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return undefined;
  }
}

function writeRecord(dependencies: ReloadDependencies, record: ReloadRecord) {
  try {
    dependencies.storage().setItem(RELOADS_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reloads the page to get the code of a newer row shape, from the server or
 * another tab, but only when the reload loses nothing: the page is hidden,
 * so no one is in the middle of an edit, and all Outbox writes are on disk.
 * A reload can still get the old code, such as from the stored page when
 * the network is slow, so a tab tries up to 3 times for each row shape,
 * with a longer gap each time. If the tab cannot record a reload, it does
 * not reload, because it could reload again and again. In all other cases
 * the sync status tells the visitor to reload.
 */
export async function reloadForRowShape(
  store: Pick<ReplicaStore, "flush" | "getStorageState">,
  newerRowShape: number,
  dependencies: ReloadDependencies,
): Promise<ReloadOutcome> {
  const safe = () =>
    dependencies.isHidden() && store.getStorageState().unsaved === 0;
  if (!dependencies.isHidden() || dependencies.inMemory()) {
    return { reloaded: false };
  }
  await store.flush();
  if (!safe()) return { reloaded: false };
  const record = readRecord(dependencies);
  if (record === undefined) return { reloaded: false };
  if (record && record.rowShape > newerRowShape) return { reloaded: false };
  const earlier =
    record?.rowShape === newerRowShape ? record : { count: 0, at: 0 };
  if (earlier.count >= MAX_RELOADS) return { reloaded: false };
  if (earlier.count > 0) {
    const retryInMs =
      earlier.at +
      FIRST_RELOAD_GAP_MS * 4 ** (earlier.count - 1) -
      dependencies.now();
    if (retryInMs > 0) return { reloaded: false, retryInMs };
  }
  const reloaded = await dependencies.reload(
    () =>
      safe() &&
      writeRecord(dependencies, {
        rowShape: newerRowShape,
        count: earlier.count + 1,
        at: dependencies.now(),
      }),
  );
  return { reloaded };
}
