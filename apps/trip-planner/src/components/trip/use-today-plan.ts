"use client";

import { useSyncExternalStore } from "react";

/**
 * On-device record of which optional stops the user has switched off for the
 * current day, so a slimmed-down plan survives a reload. Mirrors the checklist
 * store: a tiny localStorage-backed store read via `useSyncExternalStore`, one
 * per trip, SSR-safe (the server snapshot is empty) and free of
 * setState-in-effect.
 */

const EMPTY: Record<string, boolean> = {};

/** localStorage namespace per trip, alongside `${slug}-trip-checklist`. */
function storageKeyFor(tripSlug: string) {
  return `${tripSlug}-trip-plan`;
}

/** A dropped stop's id: the day plus the moment's (per-day unique) time. */
function dropId(dayN: number, time: string) {
  return `D${String(dayN)}·${time}`;
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((entry) => typeof entry === "boolean");
}

function parse(raw: string | null): Record<string, boolean> {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (isBooleanRecord(value)) return value;
  } catch {
    // Ignore malformed storage.
  }
  return EMPTY;
}

interface PlanStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Record<string, boolean>;
  setMany: (entries: Record<string, boolean>) => void;
}

function createStore(storageKey: string): PlanStore {
  const listeners = new Set<() => void>();
  let snapshot: Record<string, boolean> = EMPTY;
  let loaded = false;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const getSnapshot = () => {
    if (!loaded && typeof window !== "undefined") {
      snapshot = parse(window.localStorage.getItem(storageKey));
      loaded = true;
    }
    return snapshot;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        snapshot = parse(event.newValue);
        notify();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const setMany = (entries: Record<string, boolean>) => {
    snapshot = { ...getSnapshot(), ...entries };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore write failures (private mode / quota).
    }
    notify();
  };

  return { subscribe, getSnapshot, setMany };
}

// Cached per key so subscribe/getSnapshot identities stay stable across
// renders, as useSyncExternalStore requires.
const stores = new Map<string, PlanStore>();

function getStore(storageKey: string): PlanStore {
  const existing = stores.get(storageKey);
  if (existing) return existing;
  const created = createStore(storageKey);
  stores.set(storageKey, created);
  return created;
}

function getServerSnapshot(): Record<string, boolean> {
  return EMPTY;
}

/** What the planner needs to read and edit a day's dropped optional stops. */
export interface TodayPlan {
  /** Times of the moments currently dropped on this day. */
  dropped: Set<string>;
  /** Flip one moment between kept and dropped. */
  toggle: (time: string) => void;
  /** Restore every dropped stop on this day. */
  restoreAll: () => void;
}

/** Read and edit which optional stops are switched off for one trip day. */
export function useTodayPlan(tripSlug: string, dayN: number): TodayPlan {
  const store = getStore(storageKeyFor(tripSlug));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );

  const prefix = `D${String(dayN)}·`;
  const dropped = new Set(
    Object.entries(snapshot)
      .filter(([key, value]) => value && key.startsWith(prefix))
      .map(([key]) => key.slice(prefix.length)),
  );

  const toggle = (time: string) => {
    store.setMany({ [dropId(dayN, time)]: !dropped.has(time) });
  };

  const restoreAll = () => {
    store.setMany(
      Object.fromEntries(
        [...dropped].map((time) => [dropId(dayN, time), false]),
      ),
    );
  };

  return { dropped, toggle, restoreAll };
}
