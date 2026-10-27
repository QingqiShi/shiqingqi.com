import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import { analyticsParams } from "./analytics-params.ts";
import type { AnalyticsState } from "./compute-analytics-view.ts";

const URL_DELAY_MS = 400;

/**
 * The Analytics screen's state, read from the URL once and written back
 * in place. React state leads and the URL follows a moment later, so a new
 * range draws before the router re-renders.
 */
export function useAnalyticsState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigator = useFinanceNavigator();
  const [state, setState] = useState(() => analyticsParams.parse(searchParams));
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

  const update = (patch: Partial<AnalyticsState>) => {
    const next = { ...state, ...patch };
    setState(next);
    if (pendingRef.current !== null) clearTimeout(pendingRef.current.timer);
    const write = () => {
      pendingRef.current = null;
      if (window.location.pathname !== pathname) return;
      navigator.replace({ screen: "analytics", state: next });
    };
    pendingRef.current = { timer: setTimeout(write, URL_DELAY_MS), write };
  };

  return [state, update] as const;
}
