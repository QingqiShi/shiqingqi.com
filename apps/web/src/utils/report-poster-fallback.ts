/**
 * Diagnostic beacon for the movie-database "No Poster" tile.
 *
 * The tile is rendered by two indistinguishable code paths — a missing image
 * `configuration` (`PosterImage`) or an image that failed to load
 * (`TmdbImage`). A screenshot can't tell them apart, and the failure has only
 * been observed on a specific device (stale PWA cache suspected), so we can't
 * reproduce it on demand. This reports which path fired, plus service-worker /
 * Cache Storage context, so the next occurrence pins the root cause instead of
 * being reverse-engineered.
 *
 * Fire-and-forget and defensive: it must never affect rendering. Deduped to at
 * most one beacon per reason per page load. Inert wherever `sendBeacon` is
 * absent (SSR, jsdom tests), so it adds no behaviour to the happy path.
 *
 * Remove once the root cause is confirmed.
 */

export type PosterFallbackReason = "config-missing" | "image-error";

export interface PosterFallbackInput {
  reason: PosterFallbackReason;
  /** The image URL that failed to load (image-error only). */
  src?: string;
  /** True when detected via the cached-response probe rather than `onError`. */
  cachedProbe?: boolean;
  /** Whether the fetched config carried an `images` object at all. */
  configImagesPresent?: boolean;
  configBaseUrl?: boolean;
  configSecureBaseUrl?: boolean;
  configPosterSizes?: number;
}

const reportedReasons = new Set<PosterFallbackReason>();

export function reportPosterFallback(input: PosterFallbackInput): void {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.sendBeacon !== "function"
  ) {
    return;
  }
  if (reportedReasons.has(input.reason)) return;
  reportedReasons.add(input.reason);
  void deliver(input);
}

async function deliver(input: PosterFallbackInput): Promise<void> {
  try {
    const swContainer =
      "serviceWorker" in navigator ? navigator.serviceWorker : undefined;
    const controller = swContainer?.controller ?? null;
    const bundleScript = Array.from(document.scripts)
      .map((script) => script.src)
      .find((src) => src.includes("/_next/static/chunks/"));

    let configCached: boolean | undefined;
    let srcCached: boolean | undefined;
    if (typeof caches !== "undefined") {
      try {
        configCached = Boolean(
          await caches.match("/api/tmdb/get-configuration", {
            ignoreSearch: true,
          }),
        );
        if (input.src) {
          srcCached = Boolean(await caches.match(input.src));
        }
      } catch {
        // Cache Storage can be unavailable (private mode, etc.); skip it.
      }
    }

    const diagnostics = {
      ...input,
      url: window.location.href,
      userAgent: navigator.userAgent,
      swControlled: controller !== null,
      swScriptUrl: controller?.scriptURL,
      bundleScript,
      configCached,
      srcCached,
    };

    // Visible in Safari Web Inspector when the device is connected to a Mac.
    console.warn("[poster-fallback]", diagnostics);

    navigator.sendBeacon(
      "/api/debug/poster-fallback",
      new Blob([JSON.stringify(diagnostics)], { type: "application/json" }),
    );
  } catch {
    // Diagnostics must never interfere with rendering.
  }
}
