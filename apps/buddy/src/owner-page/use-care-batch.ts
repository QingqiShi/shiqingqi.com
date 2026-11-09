import { useEffect, useRef, useState, type RefObject } from "react";
import { MAX_CARE_PRESSES } from "#src/pet/max-care-presses.ts";
import type { PetCounters, PublicPetState } from "#src/pet/types.ts";
import type { CareKind } from "./use-pet-scene.ts";

/** How long after the last press the page sends the presses. */
const SEND_AFTER_MS = 2000;

type Timer = ReturnType<typeof setTimeout> | null;

const none = (): PetCounters => ({ fed: 0, patted: 0 });
const counterOf = (kind: CareKind) => (kind === "feed" ? "fed" : "patted");

function flush(
  url: string,
  unsentRef: RefObject<PetCounters>,
  timerRef: RefObject<Timer>,
) {
  if (timerRef.current !== null) clearTimeout(timerRef.current);
  timerRef.current = null;
  const unsent = unsentRef.current;
  unsentRef.current = none();
  if (unsent.fed + unsent.patted === 0) return;
  // `keepalive` lets the request finish after the page has gone.
  void fetch(url, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(unsent),
  }).catch(() => {});
}

/**
 * Counts the page's waterings and pats, and sends them to the care route in one request
 * `SEND_AFTER_MS` after the last press, at once when a kind reaches the limit, and when the
 * page goes away. A request that fails is not sent again. `state` is the read with every press
 * since the page opened, until the read counts them too.
 */
export function useCareBatch(read: PublicPetState) {
  const unsentRef = useRef(none());
  const timerRef = useRef<Timer>(null);
  const [before] = useState(read.visitors);
  const [pressed, setPressed] = useState(none);
  const url = `/api/v1/u/${encodeURIComponent(read.user)}/care`;

  useEffect(() => {
    const flushNow = () => {
      flush(url, unsentRef, timerRef);
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onHidden);
      flushNow();
    };
  }, [url]);

  const press = (kind: CareKind) => {
    const counter = counterOf(kind);
    unsentRef.current[counter] += 1;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flush(url, unsentRef, timerRef);
    }, SEND_AFTER_MS);
    if (unsentRef.current[counter] >= MAX_CARE_PRESSES) {
      flush(url, unsentRef, timerRef);
    }
    setPressed((current) => ({ ...current, [counter]: current[counter] + 1 }));
  };

  const state: PublicPetState = {
    ...read,
    visitors: {
      fed: Math.max(read.visitors.fed, before.fed + pressed.fed),
      patted: Math.max(read.visitors.patted, before.patted + pressed.patted),
    },
  };

  return { state, press };
}
