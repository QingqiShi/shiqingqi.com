import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pollDelayMs } from "../home/poll-delay-ms.ts";
import {
  AWAY_BEFORE_REFRESH_MS,
  refreshAfterPoll,
} from "../home/refresh-after-poll.ts";
import { runChange, type RunChange } from "../home/run-change.ts";
import { selectHomeCard } from "../home/select-home-card.ts";
import type { HomeStatus, HomeView } from "../home/types.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

const TICK_MS = 1000;

async function readStatus(signal: AbortSignal): Promise<HomeStatus | null> {
  try {
    const response = await assistantFetch("/api/home/status", {
      cache: "no-store",
      signal,
    });
    return (await response.json()) as HomeStatus;
  } catch {
    return null;
  }
}

/**
 * The status of `/`, kept current by polling. It starts from the status of
 * the server's render, and a later render replaces it, so the first paint
 * agrees with the server and has no flash. Time is the server's: only the
 * difference between the two clocks comes from this device.
 */
export function useHomeStatus(seed: HomeStatus, view: HomeView) {
  const router = useRouter();
  const [status, setStatus] = useState(seed);
  const [nowMs, setNowMs] = useState(() => Date.parse(seed.serverNow));
  const [change, setChange] = useState<RunChange | null>(null);
  const statusRef = useRef(seed);
  const skewRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  const refreshedRef = useRef(new Set<string>());

  if (Date.parse(seed.serverNow) > Date.parse(status.serverNow)) {
    setStatus(seed);
    setNowMs(Date.parse(seed.serverNow));
  }

  const card = selectHomeCard(status, nowMs);
  const ticks = card.kind === "running" || card.kind === "countdown";
  const checkingEndsAtMs = card.kind === "checking" ? card.endsAtMs : null;

  useEffect(() => {
    if (!ticks) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        setNowMs(Date.now() + skewRef.current);
      }
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [ticks]);

  useEffect(() => {
    if (checkingEndsAtMs === null) return;
    const timer = setTimeout(
      () => {
        setNowMs(Date.now() + skewRef.current);
      },
      checkingEndsAtMs - (Date.now() + skewRef.current),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [checkingEndsAtMs]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polling = false;

    async function poll() {
      polling = true;
      const sentAt = Date.now();
      const next = await readStatus(signal);
      polling = false;
      if (signal.aborted) return;
      if (next) {
        skewRef.current =
          Date.parse(next.serverNow) - (sentAt + Date.now()) / 2;
        const previous = statusRef.current.run;
        const changed = runChange(previous, next.run);
        if (changed) setChange(changed);
        const key = refreshAfterPoll({
          view,
          renderedDate: seed.localDate,
          previous,
          next,
          done: refreshedRef.current,
        });
        if (key) {
          refreshedRef.current.add(key);
          router.refresh();
        }
        statusRef.current = next;
        setStatus(next);
      }
      const now = Date.now() + skewRef.current;
      setNowMs(now);
      pollAfter(pollDelayMs(statusRef.current, now));
    }

    function pollAfter(delayMs: number) {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") return;
      timer = setTimeout(() => {
        void poll();
      }, delayMs);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        clearTimeout(timer);
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (
        hiddenAt !== null &&
        Date.now() - hiddenAt >= AWAY_BEFORE_REFRESH_MS
      ) {
        router.refresh();
      }
      setNowMs(Date.now() + skewRef.current);
      if (!polling) pollAfter(0);
    }

    const seedAt = Date.parse(seed.serverNow);
    const lastAt = Date.parse(statusRef.current.serverNow);
    if (seedAt >= lastAt) {
      statusRef.current = seed;
      skewRef.current = seedAt - Date.now();
    }
    if (document.visibilityState === "hidden" && hiddenAtRef.current === null) {
      hiddenAtRef.current = Date.now();
    }
    // Only a seed from a later render is known to be current. A first seed can
    // be old after a back or forward restore, so the first poll does not wait.
    pollAfter(seedAt > lastAt ? pollDelayMs(seed, seedAt) : 0);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(timer);
      controller.abort();
    };
  }, [seed, view, router]);

  return { card, change };
}
