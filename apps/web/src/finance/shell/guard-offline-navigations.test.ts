import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FINANCE_OFFLINE_HEADER } from "#src/pwa/runtime-caching/finance-offline-header.ts";
import { guardOfflineNavigations } from "./guard-offline-navigations.ts";

const NOT_YET = Symbol("not yet");
const navigationHeaders = { rsc: "1", "next-router-state-tree": "%5B%5D" };

function offlineError() {
  return new Response(null, {
    status: 503,
    headers: { [FINANCE_OFFLINE_HEADER]: "1" },
  });
}

/** A fetch whose answers the test releases by hand. */
function manualFetch() {
  const answers: ((response: Response) => void)[] = [];
  const fetch = () =>
    new Promise<Response>((resolve) => {
      answers.push(resolve);
    });
  return {
    fetch,
    answer(response: Response) {
      answers.shift()?.(response);
    },
  };
}

async function settled(promise: Promise<Response>) {
  return Promise.race([
    promise,
    new Promise<typeof NOT_YET>((resolve) => {
      setTimeout(() => {
        resolve(NOT_YET);
      }, 20);
    }),
  ]);
}

let original: typeof window.fetch;
let restore: () => void;
let server: ReturnType<typeof manualFetch>;

beforeEach(() => {
  original = window.fetch.bind(window);
  server = manualFetch();
  window.fetch = server.fetch;
  window.history.replaceState(null, "", "/finance/transactions");
  restore = guardOfflineNavigations();
});

afterEach(() => {
  restore();
  window.fetch = original;
});

describe("guardOfflineNavigations", () => {
  it("drops the offline error of a screen the visitor already left", async () => {
    const request = window.fetch("/finance/transactions?_rsc=abc", {
      headers: navigationHeaders,
    });
    window.history.pushState(null, "", "/finance/analytics");
    server.answer(offlineError());
    expect(await settled(request)).toBe(NOT_YET);
  });

  it("passes the offline error on when the address still shows that screen", async () => {
    const stay = window.fetch("/finance/analytics?_rsc=abc", {
      headers: navigationHeaders,
    });
    window.history.pushState(null, "", "/finance/analytics");
    server.answer(offlineError());
    expect(await settled(stay)).toMatchObject({ status: 503 });

    const notCommitted = window.fetch("/finance/reports?_rsc=def", {
      headers: navigationHeaders,
    });
    server.answer(offlineError());
    expect(await settled(notCommitted)).toMatchObject({ status: 503 });
  });

  it("leaves prefetches, server errors and other requests alone", async () => {
    const prefetch = window.fetch("/finance/transactions?_rsc=abc", {
      headers: navigationHeaders,
      priority: "low",
    });
    const failing = window.fetch("/finance/reports?_rsc=abc", {
      headers: navigationHeaders,
    });
    window.history.pushState(null, "", "/finance/analytics");
    server.answer(offlineError());
    server.answer(new Response(null, { status: 503 }));
    expect(await settled(prefetch)).toMatchObject({ status: 503 });
    expect(await settled(failing)).toMatchObject({ status: 503 });
  });

  it("does nothing after cleanup", async () => {
    restore();
    const request = window.fetch("/finance/transactions?_rsc=abc", {
      headers: navigationHeaders,
    });
    window.history.pushState(null, "", "/finance/analytics");
    server.answer(offlineError());
    expect(await settled(request)).toMatchObject({ status: 503 });
  });
});
