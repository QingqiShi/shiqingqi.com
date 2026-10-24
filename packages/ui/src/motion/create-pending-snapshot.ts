/**
 * A snapshot that a motion reads on intent, such as on a click, before the
 * change it marks commits. `take(key)` reads it for a change that lands at
 * `key`, and `refresh` reads it again while it waits.
 *
 * `claim(here, isMotion)` gives the snapshot to the commit that lands at
 * `here`:
 *
 * - A motion at the snapshot's key takes it.
 * - A motion elsewhere drops it, and plays without it.
 * - A commit at the key with no motion drops it, because it moved nothing.
 * - Any other commit leaves it to wait for a later one.
 *
 * Thus a change that does not happen, or that another change replaces,
 * cannot give its snapshot to an unrelated motion.
 *
 * @internal
 */
export interface PendingSnapshot<T> {
  take(key: string): void;
  refresh(): void;
  claim(here: string, isMotion: boolean): T | null;
}

/** @internal */
export function createPendingSnapshot<T>(read: () => T): PendingSnapshot<T> {
  let pending: { key: string; snapshot: T } | null = null;
  return {
    take(key) {
      pending = { key, snapshot: read() };
    },
    refresh() {
      if (pending !== null) pending = { key: pending.key, snapshot: read() };
    },
    claim(here, isMotion) {
      if (pending === null) return null;
      const { key, snapshot } = pending;
      if (key === here) {
        pending = null;
        return isMotion ? snapshot : null;
      }
      if (isMotion) pending = null;
      return null;
    },
  };
}
