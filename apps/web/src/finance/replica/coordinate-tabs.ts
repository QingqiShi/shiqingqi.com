import type { SyncStatus } from "./types.ts";

type TabMessage =
  | { type: "replica-changed" }
  | { type: "outbox-changed" }
  | { type: "status"; status: SyncStatus }
  | { type: "sync-requested" };

type WireMessage = TabMessage | { type: "hello" };

interface Envelope {
  rowShape: number;
  message: WireMessage;
}

interface TabCoordinatorOptions {
  /** One name per Household. */
  name: string;
  /** The row shape of the code in this tab. */
  rowShape: number;
  /** This tab now runs the network loop. */
  onLeader: () => void;
  /** A tab with newer code is open. This tab does not lead now, and never will. */
  onNewerTab: (rowShape: number) => void;
  onMessage: (message: TabMessage) => void;
}

/**
 * Elects one tab to run the sync loop through the Web Locks API and lets the
 * tabs talk through a BroadcastChannel. Without Web Locks every tab leads;
 * the server applies each mutation once, so that is only extra traffic.
 *
 * Every message says the row shape of its tab, and each tab says hello when
 * it opens, so tabs that run different code find each other. A tab that
 * finds a newer one gives up the lead for good, so the newer one leads. A
 * tab hears only the tabs of its own row shape, except that a newer tab
 * still hears when an older one adds to the Outbox.
 */
export function coordinateTabs(options: TabCoordinatorOptions) {
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(options.name);
  const abort = new AbortController();
  let release: (() => void) | null = null;
  let closed = false;
  let newestRowShape = options.rowShape;

  function post(message: WireMessage) {
    const envelope: Envelope = { rowShape: options.rowShape, message };
    channel?.postMessage(envelope);
  }

  function receive({ rowShape, message }: Envelope) {
    if (rowShape > newestRowShape) {
      newestRowShape = rowShape;
      abort.abort();
      release?.();
      release = null;
      options.onNewerTab(rowShape);
      return;
    }
    if (newestRowShape > options.rowShape) return;
    if (rowShape < options.rowShape) {
      if (message.type === "hello") post({ type: "hello" });
      else if (message.type === "outbox-changed") options.onMessage(message);
      return;
    }
    if (message.type !== "hello") options.onMessage(message);
  }

  if (channel) {
    channel.onmessage = (event: MessageEvent<Envelope>) => {
      receive(event.data);
    };
  }
  post({ type: "hello" });

  const canLead = () => !closed && newestRowShape === options.rowShape;
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (typeof locks?.request === "function") {
    locks
      .request(options.name, { signal: abort.signal }, () => {
        if (!canLead()) return Promise.resolve();
        options.onLeader();
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => {
        // An abort rejects the request. Nothing waits for it.
      });
  } else {
    queueMicrotask(() => {
      if (canLead()) options.onLeader();
    });
  }

  return {
    broadcast(message: TabMessage) {
      post(message);
    },
    close() {
      closed = true;
      abort.abort();
      release?.();
      channel?.close();
    },
  };
}
