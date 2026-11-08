import { useEffect, useState } from "react";

/** How often a pet page looks for new state. */
export const REFRESH_MS = 60_000;

/**
 * The state at `url`, fetched again every `intervalMs` while the tab is visible, and when it
 * becomes visible. A null `url` keeps the initial state as it is.
 */
export function useLiveState<State>(
  initial: State,
  url: string | null,
  intervalMs: number,
) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const json = await response.text();
        setState((current) =>
          JSON.stringify(current) === json
            ? current
            : (JSON.parse(json) as State),
        );
      } catch {
        // A failed refresh keeps the state on show; the next tick tries again.
      }
    };
    const timer = setInterval(() => void load(), intervalMs);
    const onVisible = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, intervalMs]);

  return state;
}
