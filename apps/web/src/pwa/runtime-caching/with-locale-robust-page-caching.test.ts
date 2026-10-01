import { PAGES_CACHE_NAME } from "@serwist/next/worker";
import { NetworkFirst, type RuntimeCaching } from "serwist";
import { describe, expect, it } from "vitest";
import { withLocaleRobustPageCaching } from "./with-locale-robust-page-caching";

function cacheWillUpdateParam(response: Response) {
  return {
    request: new Request("https://example.com"),
    response,
    event: Object.assign(new Event("fetch"), { waitUntil: () => {} }),
  };
}

describe("withLocaleRobustPageCaching", () => {
  it("adds a locale-robust cacheWillUpdate plugin to every locale-sensitive page cache, and leaves the rest untouched", async () => {
    const pages = new NetworkFirst({ cacheName: PAGES_CACHE_NAME.html });
    const pagesRsc = new NetworkFirst({ cacheName: PAGES_CACHE_NAME.rsc });
    const pagesRscPrefetch = new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.rscPrefetch,
    });
    const others = new NetworkFirst({ cacheName: "others" });
    const apis = new NetworkFirst({ cacheName: "apis" });
    const functionHandler: RuntimeCaching["handler"] = () =>
      Promise.resolve(new Response());

    const runtimeCaching: RuntimeCaching[] = [
      { matcher: /.*/, handler: pages },
      { matcher: /.*/, handler: pagesRsc },
      { matcher: /.*/, handler: pagesRscPrefetch },
      { matcher: /.*/, handler: others },
      { matcher: /.*/, handler: apis },
      { matcher: /.*/, handler: functionHandler },
    ];
    const pageCacheHandlers = [pages, pagesRsc, pagesRscPrefetch, others];
    const pluginCountsBefore = pageCacheHandlers.map(
      (handler) => handler.plugins.length,
    );
    const apisPluginCountBefore = apis.plugins.length;

    const result = withLocaleRobustPageCaching(runtimeCaching);

    expect(result).toBe(runtimeCaching);
    for (const [index, handler] of pageCacheHandlers.entries()) {
      expect(handler.plugins.length).toBe(pluginCountsBefore[index] + 1);

      // The rejection probe uses a 404: a redirect response would take the
      // eviction path, which needs the CacheStorage global a service worker
      // has and this test environment does not. Redirect classification is
      // covered by the isRedirectResponse tests.
      const addedPlugin = handler.plugins.at(-1);
      await expect(
        addedPlugin?.cacheWillUpdate?.(
          cacheWillUpdateParam(new Response(null, { status: 404 })),
        ),
      ).resolves.toBeNull();

      const cacheableResponse = new Response("x", { status: 200 });
      await expect(
        addedPlugin?.cacheWillUpdate?.(cacheWillUpdateParam(cacheableResponse)),
      ).resolves.toBe(cacheableResponse);
    }

    expect(apis.plugins.length).toBe(apisPluginCountBefore);
    expect(runtimeCaching[5]?.handler).toBe(functionHandler);
  });
});
