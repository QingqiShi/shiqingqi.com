import { useSyncExternalStore } from "react";
import { MINUTE_MS } from "#src/pet/local-time.ts";

function subscribe(onTick: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(
      () => {
        onTick();
        schedule();
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
  };
  schedule();
  return () => {
    clearTimeout(timer);
  };
}

function currentMinute() {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

/**
 * The time, to the minute, ticking on each new minute. Hydration renders `serverNow`, the time
 * the server rendered at, so that the server and the first client render draw the same.
 */
export function useMinuteClock(serverNow: number) {
  return useSyncExternalStore(subscribe, currentMinute, () => serverNow);
}
