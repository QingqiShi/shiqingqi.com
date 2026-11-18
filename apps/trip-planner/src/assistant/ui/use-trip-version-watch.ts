import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { assistantApi } from "#src/assistant/assistant-api.ts";

const WATCH_MS = 15_000;

/**
 * While `active`, asks every 15 seconds for the trip's version, and reads
 * the trip again when it is not the one on the page, so that a change by
 * another member shows. The frame already reads the page again when the
 * person comes back to it.
 */
export function useTripVersionWatch(
  tripId: string,
  shownVersion: string,
  active: boolean,
) {
  const router = useRouter();
  const check = useEffectEvent(async (signal: AbortSignal) => {
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    const answer = await assistantApi.version(tripId, signal).catch(() => null);
    if (answer && !signal.aborted && answer.version !== shownVersion) {
      router.refresh();
    }
  });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      void check(controller.signal);
    }, WATCH_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [active]);
}
