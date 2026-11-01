import { useEffect, useEffectEvent } from "react";

/** Calls `handler` for every key press in the window, with the latest props and state. */
export function useWindowKeydown(handler: (event: KeyboardEvent) => void) {
  const handle = useEffectEvent(handler);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handle(event);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);
}
