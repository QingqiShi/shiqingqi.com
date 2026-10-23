import { describe, expect, it, vi } from "vitest";
import { updateServiceWorker } from "./reload-page.ts";

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = "installing";

  moveTo(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

/** Service workers whose update finds `worker`, or nothing, or fails. */
function containerWith(update: () => Promise<FakeWorker | null>) {
  const registration: {
    installing: FakeWorker | null;
    waiting: null;
    update: () => Promise<void>;
  } = {
    installing: null,
    waiting: null,
    update: async () => {
      registration.installing = await update();
    },
  };
  return { getRegistration: () => Promise.resolve(registration) };
}

async function settledAfter(promise: Promise<void>, ms: number) {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  await vi.advanceTimersByTimeAsync(ms);
  return settled;
}

describe("updateServiceWorker", () => {
  it("waits until a new worker activates", async () => {
    vi.useFakeTimers();
    try {
      const worker = new FakeWorker();
      const updating = updateServiceWorker(
        containerWith(() => Promise.resolve(worker)),
        5_000,
      );
      expect(await settledAfter(updating, 100)).toBe(false);
      worker.moveTo("installed");
      expect(await settledAfter(updating, 0)).toBe(false);
      worker.moveTo("activated");
      expect(await settledAfter(updating, 0)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits no longer than the time it is given", async () => {
    vi.useFakeTimers();
    try {
      const updating = updateServiceWorker(
        containerWith(() => Promise.resolve(new FakeWorker())),
        5_000,
      );
      expect(await settledAfter(updating, 4_999)).toBe(false);
      expect(await settledAfter(updating, 1)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["there is no new worker", () => Promise.resolve(null)],
    ["the update fails", () => Promise.reject(new TypeError("Offline"))],
  ])(
    "resolves at once when %s",
    async (_, update: () => Promise<FakeWorker | null>) => {
      vi.useFakeTimers();
      try {
        const updating = updateServiceWorker(containerWith(update), 5_000);
        expect(await settledAfter(updating, 0)).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it("resolves at once without a service worker", async () => {
    await expect(updateServiceWorker(undefined)).resolves.toBeUndefined();
  });
});
