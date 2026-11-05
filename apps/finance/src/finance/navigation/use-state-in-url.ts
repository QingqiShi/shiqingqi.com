import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FinanceDestination } from "./finance-href.ts";
import { useFinanceNavigator } from "./finance-navigator.ts";

const URL_DELAY_MS = 400;

/**
 * The state of a screen that its URL also holds. React state leads and the
 * URL follows a moment later, in place, so a new state draws before the
 * router re-renders. `destinationOf` gives the URL of a state.
 */
export function useStateInUrl<State>(
  initial: () => State,
  destinationOf: (state: State) => FinanceDestination,
) {
  const pathname = usePathname();
  const navigator = useFinanceNavigator();
  const [state, setState] = useState(initial);
  const pendingRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    write: () => void;
  } | null>(null);

  useEffect(() => {
    // A late replaceState cancels a navigation that is in progress, so a
    // click that can navigate first writes the waiting URL.
    const flush = () => {
      const pending = pendingRef.current;
      if (pending === null) return;
      clearTimeout(pending.timer);
      pending.write();
    };
    document.addEventListener("click", flush, { capture: true });
    document.addEventListener("keydown", flush, { capture: true });
    return () => {
      document.removeEventListener("click", flush, { capture: true });
      document.removeEventListener("keydown", flush, { capture: true });
      if (pendingRef.current !== null) clearTimeout(pendingRef.current.timer);
    };
  }, []);

  const update = (next: State) => {
    setState(next);
    if (pendingRef.current !== null) clearTimeout(pendingRef.current.timer);
    const destination = destinationOf(next);
    const write = () => {
      pendingRef.current = null;
      if (window.location.pathname !== pathname) return;
      navigator.replace(destination);
    };
    pendingRef.current = { timer: setTimeout(write, URL_DELAY_MS), write };
  };

  return [state, update] as const;
}
