"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Checklist } from "@/data/types";
import { cn } from "@/lib/utils";

const EMPTY: Record<string, boolean> = {};

/** localStorage namespace per trip; "gb" keeps its pre-multi-trip key. */
function storageKeyFor(tripSlug: string) {
  return `${tripSlug}-trip-checklist`;
}

function itemId(dayN: number, title: string, index: number) {
  return `D${String(dayN)}·${title}·${String(index)}`;
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every(
    (entry: unknown) => typeof entry === "boolean",
  );
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

// A tiny localStorage-backed store read via useSyncExternalStore — SSR-safe
// (server snapshot is empty) and free of setState-in-effect. One store per
// trip so each trip's ticks live under their own key.
interface ChecklistStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Record<string, boolean>;
  setChecked: (id: string, value: boolean) => void;
}

function createStore(storageKey: string): ChecklistStore {
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

  const setChecked = (id: string, value: boolean) => {
    snapshot = { ...getSnapshot(), [id]: value };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore write failures (private mode / quota).
    }
    notify();
  };

  return { subscribe, getSnapshot, setChecked };
}

// Cached per key so subscribe/getSnapshot identities stay stable across
// renders, as useSyncExternalStore requires.
const stores = new Map<string, ChecklistStore>();

function getStore(storageKey: string): ChecklistStore {
  const existing = stores.get(storageKey);
  if (existing) return existing;
  const created = createStore(storageKey);
  stores.set(storageKey, created);
  return created;
}

function getServerSnapshot(): Record<string, boolean> {
  return EMPTY;
}

/** A single tick-through checklist card with on-device persistence. */
export function ChecklistCard({
  tripSlug,
  dayN,
  list,
}: {
  tripSlug: string;
  dayN: number;
  list: Checklist;
}) {
  const store = getStore(storageKeyFor(tripSlug));
  const checked = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
  const [isOpen, setIsOpen] = useState(false);

  const total = list.items.length;
  const doneCount = list.items.filter(
    (_, i) => checked[itemId(dayN, list.title, i)],
  ).length;
  const allDone = total > 0 && doneCount === total;

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => {
          setIsOpen((value) => !value);
        }}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums",
            allDone
              ? "border-foreground bg-foreground text-background"
              : "text-muted-foreground",
          )}
        >
          {allDone ? <Check className="size-3.5" /> : doneCount}
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium">{list.title}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {doneCount}/{total}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div className="border-t px-4 py-3">
          <ul className="space-y-0.5">
            {list.items.map((item, i) => {
              const id = itemId(dayN, list.title, i);
              const isChecked = checked[id] ?? false;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      store.setChecked(id, !isChecked);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg py-1.5 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isChecked
                          ? "border-foreground bg-foreground text-background"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {isChecked ? <Check className="size-3" /> : null}
                    </span>
                    <span
                      className={cn(
                        "text-sm leading-relaxed",
                        isChecked && "text-muted-foreground line-through",
                      )}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {list.note ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {list.note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
