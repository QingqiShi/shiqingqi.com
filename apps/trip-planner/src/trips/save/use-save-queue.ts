import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { tripApi } from "#src/trips/trip-api.ts";
import type { Trip } from "#src/trips/types.ts";
import { createSaveQueue } from "./create-save-queue.ts";
import { useOnline } from "./use-online.ts";

/**
 * The save queue of one trip, with its state and the connection. Each change
 * that lands refreshes the pages of the app. When the connection comes
 * back, the queue reads the newest trip.
 */
export function useSaveQueue(tripId: string, trip: Trip) {
  const router = useRouter();
  const isOnline = useOnline();
  const [queue] = useState(() =>
    createSaveQueue({
      trip,
      // The request goes on after the person leaves the screen, and the
      // refresh then makes the other pages show the change.
      async send(ops) {
        const result = await tripApi.change(tripId, ops);
        if (result.status === "applied") router.refresh();
        return result;
      },
      read: () => tripApi.read(tripId),
    }),
  );
  const state = useSyncExternalStore(
    queue.subscribe,
    queue.getState,
    queue.getState,
  );

  useEffect(() => {
    if (isOnline) queue.sync();
  }, [isOnline, queue]);

  return { queue, state, isOnline };
}
