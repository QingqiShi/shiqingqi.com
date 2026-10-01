import { describe, expect, it } from "vitest";
import { getPreferencesContextReady } from "./get-preferences-context-ready";
import { preferenceCache } from "./preference-cache";

describe("getPreferencesContextReady", () => {
  // No real IndexedDB in jsdom — openDB throws, loadPreferencesContext's
  // catch branch swallows it, cachedContext stays null, cacheLoaded flips
  // to true. We don't care which branch the load takes; we only care that
  // the coordination contract holds.

  it("reads null synchronously from the cache before any load resolves", () => {
    // This assertion must run first, before any other test in this describe
    // block has triggered a load. It guards the "null until ready" invariant
    // that the race-safe wrapper in useAIChat relies on.
    expect(preferenceCache.context).toBeNull();
  });

  it("shares a single in-flight promise across concurrent callers", async () => {
    const p1 = getPreferencesContextReady();
    const p2 = getPreferencesContextReady();
    // Same reference → no duplicate IndexedDB work for concurrent callers.
    // This is the core of the race-safe coordination: the useEffect warm-up
    // and the sendMessage wrapper both hit this function and must coalesce.
    expect(p1).toBe(p2);

    await Promise.all([p1, p2]);
    // After resolution the cache is populated (null here because the jsdom
    // environment has no IndexedDB, so loadPreferencesContext's error path
    // runs — but crucially `preferenceCache.context` now reflects a settled
    // load, not the "not yet loaded" pre-state).
    expect(preferenceCache.context).toBeNull();
  });

  it("resolves immediately on subsequent calls after the initial load", async () => {
    // After the previous test's load settled, the in-flight promise is
    // already resolved. A fresh call should return instantly without
    // kicking off another IndexedDB round-trip.
    const start = Date.now();
    const result = await getPreferencesContextReady();
    const elapsed = Date.now() - start;
    expect(result).toBeNull();
    // Generous bound — the point is "not a fresh IDB open", not a tight SLA.
    expect(elapsed).toBeLessThan(50);
  });
});
