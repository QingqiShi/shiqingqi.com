import { useEffect, useEffectEvent } from "react";

/**
 * Calls `onReturn` when the person comes back to the page after it was out
 * of view or lost focus, such as from another tab where they changed the
 * trip. It calls once for each return, and not while the browser is offline.
 */
export function useOnReturn(onReturn: () => void) {
  const returned = useEffectEvent(onReturn);

  useEffect(() => {
    let isAway = false;
    const leave = () => {
      isAway = true;
    };
    const come = () => {
      if (!isAway || document.visibilityState !== "visible") return;
      isAway = false;
      if (navigator.onLine) returned();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") leave();
      else come();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", come);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", come);
    };
  }, []);
}
