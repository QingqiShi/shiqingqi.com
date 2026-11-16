import { defaultCache, PAGES_CACHE_NAME } from "@serwist/next/worker";
import { Strategy } from "serwist";
import { expect, it, vi } from "vitest";
import { withLocaleRobustPageCaching } from "./with-locale-robust-page-caching";

// `defaultCache` reads NODE_ENV when it loads. Outside production it is one
// NetworkOnly route.
vi.hoisted(() => {
  vi.stubEnv("NODE_ENV", "production");
});

// Serwist finds its handlers with `instanceof Strategy`. When the install has
// two copies of `serwist`, the handlers of `defaultCache` come from the other
// copy: the check fails, and no plugin or offline fallback reaches them.
it("adds its plugin to the page handlers of defaultCache", () => {
  const pages = defaultCache
    .map(({ handler }) => handler)
    .find(
      (handler) =>
        handler instanceof Strategy &&
        handler.cacheName === PAGES_CACHE_NAME.html,
    );
  if (!(pages instanceof Strategy)) {
    throw new Error("defaultCache has no page handler from this serwist");
  }

  const before = pages.plugins.length;
  withLocaleRobustPageCaching(defaultCache);

  expect(pages.plugins).toHaveLength(before + 1);
});
