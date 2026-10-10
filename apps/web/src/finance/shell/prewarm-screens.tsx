"use client";

import { useEffect } from "react";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { requestIdle, runStepsWhenIdle } from "./run-steps-when-idle.ts";

/** Wait for the Replica to stop changing for this long before warming again. */
const QUIET_MS = 500;

/**
 * Fills the memos of the screens' Replica selectors in idle time once the
 * Replica holds data, and again after it changes, so the first switch to
 * a screen does not compute them. The selectors load as a separate chunk,
 * in idle time too.
 */
export function PrewarmScreens() {
  const store = useReplicaStore();

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stop: (() => void) | null = null;
    let warmed: unknown = null;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(warm, QUIET_MS);
    };
    const warm = () => {
      const { tables, loaded, bootstrapped } = store.getSnapshot();
      if (!loaded || !bootstrapped || stop || tables === warmed) return;
      warmed = tables;
      stop = requestIdle(() => {
        import("./screen-warm-steps.ts").then(
          ({ screenWarmSteps }) => {
            if (disposed) return;
            stop = runStepsWhenIdle(screenWarmSteps(store), {
              onDone: () => {
                stop = null;
                schedule();
              },
            });
          },
          () => {
            stop = null;
          },
        );
      });
    };

    warm();
    const unsubscribe = store.subscribe(schedule);
    return () => {
      disposed = true;
      unsubscribe();
      clearTimeout(timer);
      stop?.();
    };
  }, [store]);

  return null;
}
