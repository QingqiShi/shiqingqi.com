"use client";

import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { Badge } from "@tuja/ui/components/badge";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useSyncExternalStore } from "react";
import { ItemChangeLine } from "#src/reader/quick-edit/use-item-change-button.tsx";
import { TripText, useTripLang } from "#src/reader/trip-text.tsx";
import type { Checklist as ChecklistData } from "#src/trips/types.ts";

type Checklist = ChecklistData & { id: string };

const EMPTY: Record<string, boolean> = {};

/** localStorage namespace per trip. */
function storageKeyFor(tripId: string) {
  return `${tripId}-trip-checklist`;
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
      try {
        snapshot = parse(window.localStorage.getItem(storageKey));
      } catch {
        // Storage is blocked. The ticks stay only for this visit.
      }
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

/**
 * A list to tick through, kept on this device, folded until it is opened.
 * With no `tripId` it is a list of a past version: it shows no ticks, and it
 * cannot be ticked.
 */
export function ChecklistCard({
  tripId,
  list,
}: {
  tripId: string | null;
  list: Checklist;
}) {
  return tripId === null ? (
    <ChecklistView list={list} />
  ) : (
    <KeptChecklist tripId={tripId} list={list} />
  );
}

function KeptChecklist({ tripId, list }: { tripId: string; list: Checklist }) {
  const store = getStore(storageKeyFor(tripId));
  const checked = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
  return (
    <ChecklistView list={list} checked={checked} onTick={store.setChecked} />
  );
}

function ChecklistView({
  list,
  checked,
  onTick,
}: {
  list: Checklist;
  checked?: Record<string, boolean>;
  onTick?: (id: string, value: boolean) => void;
}) {
  const lang = useTripLang();

  const total = list.items.length;
  const doneCount = list.items.filter((item) => checked?.[item.id]).length;

  return (
    <Disclosure
      look="card"
      icon={<ListChecksIcon weight="bold" />}
      summary={<TripText>{list.title}</TripText>}
      trailing={
        checked ? (
          <Badge size="sm" intent={doneCount === total ? "success" : "neutral"}>
            {doneCount}/{total}
          </Badge>
        ) : (
          <Badge size="sm" intent="neutral">
            {total}
          </Badge>
        )
      }
    >
      <div css={stack.item}>
        <div lang={lang} css={stack.tight}>
          {list.items.map((item) => (
            <Checkbox
              key={item.id}
              look="done"
              label={item.text}
              readOnly={!onTick}
              checked={checked?.[item.id] ?? false}
              onChange={(event) => {
                onTick?.(item.id, event.target.checked);
              }}
            />
          ))}
        </div>
        {list.note ? (
          <Text look="caption" tone="muted">
            <TripText>{list.note}</TripText>
          </Text>
        ) : null}
        <ItemChangeLine id={list.id} name={list.title} />
      </div>
    </Disclosure>
  );
}
