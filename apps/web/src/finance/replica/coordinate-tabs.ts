import type { SyncStatus } from "./types.ts";

type TabMessage =
  | { type: "replica-changed" }
  | { type: "outbox-changed" }
  | { type: "status"; status: SyncStatus }
  | { type: "sync-requested" };

interface TabCoordinatorOptions {
  /** One name per Household. */
  name: string;
  /** This tab now runs the network loop. */
  onLeader: () => void;
  onMessage: (message: TabMessage) => void;
}

/**
 * Elects one tab to run the sync loop through the Web Locks API and lets the
 * tabs talk through a BroadcastChannel. Without Web Locks every tab leads;
 * the server applies each mutation once, so that is only extra traffic.
 */
export function coordinateTabs(options: TabCoordinatorOptions) {
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(options.name);
  if (channel) {
    channel.onmessage = (event: MessageEvent<TabMessage>) => {
      options.onMessage(event.data);
    };
  }

  const abort = new AbortController();
  let release: (() => void) | null = null;
  let closed = false;
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (typeof locks?.request === "function") {
    locks
      .request(options.name, { signal: abort.signal }, () => {
        if (closed) return Promise.resolve();
        options.onLeader();
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => {
        // An abort on close rejects the request. Nothing waits for it.
      });
  } else {
    queueMicrotask(() => {
      if (!closed) options.onLeader();
    });
  }

  return {
    broadcast(message: TabMessage) {
      channel?.postMessage(message);
    },
    close() {
      closed = true;
      abort.abort();
      release?.();
      channel?.close();
    },
  };
}
