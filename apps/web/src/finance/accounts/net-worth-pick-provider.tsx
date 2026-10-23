"use client";

import {
  createContext,
  use,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ChartPick } from "../charts/time-series-chart.tsx";

interface PickStore {
  get: () => ChartPick | null;
  set: (pick: ChartPick | null) => void;
  subscribe: (listener: () => void) => () => void;
}

function createPickStore(): PickStore {
  let pick: ChartPick | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => pick,
    set: (next) => {
      if (next === pick) return;
      pick = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const PickContext = createContext<PickStore | null>(null);

/**
 * Holds what is picked on the net-worth trend, so that a headline in another
 * column shows it. A pick re-renders only the parts that read it.
 */
export function NetWorthPickProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPickStore);
  return <PickContext value={store}>{children}</PickContext>;
}

function usePickStore() {
  const store = use(PickContext);
  if (store === null) {
    throw new Error("Use the net-worth pick inside NetWorthPickProvider.");
  }
  return store;
}

/**
 * What is picked on the net-worth trend now. A pick draws the caller again
 * only while `shownIn`, the element that shows the pick, renders.
 */
export function useNetWorthPick(shownIn: Element | null) {
  const store = usePickStore();
  const subscribe = (listener: () => void) =>
    store.subscribe(() => {
      if (shownIn?.checkVisibility({ visibilityProperty: true }) !== false) {
        listener();
      }
    });
  return useSyncExternalStore(subscribe, store.get, () => null);
}

/** Tells the headlines what is picked on the net-worth trend. */
export function useSetNetWorthPick() {
  return usePickStore().set;
}
