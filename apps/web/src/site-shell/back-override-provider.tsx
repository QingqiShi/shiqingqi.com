"use client";

import {
  createContext,
  use,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Registry that lets a subtree intercept the global `BackButton`. A child
 * component (e.g. the inline chat provider, which lives inside the
 * movie-database layout) calls `setBackOverride` with its exit handler when
 * active and `null` when not. The BackButton — rendered in the shared header
 * above the inline-chat provider — consumes `hasBackOverride` + `triggerBack`
 * to decide whether to navigate or call back into the child.
 *
 * The handler lives in a ref so registering it doesn't re-render the header
 * on every parent render.
 */
interface BackOverrideState {
  hasBackOverride: boolean;
  setBackOverride: (handler: (() => void) | null) => void;
  triggerBack: () => void;
}

const BackOverrideContext = createContext<BackOverrideState>({
  hasBackOverride: false,
  setBackOverride: () => {},
  triggerBack: () => {},
});

export function BackOverrideProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<(() => void) | null>(null);
  const [hasBackOverride, setHasBackOverride] = useState(false);

  const setBackOverride = useCallback((handler: (() => void) | null) => {
    handlerRef.current = handler;
    setHasBackOverride(handler !== null);
  }, []);

  const triggerBack = useCallback(() => {
    handlerRef.current?.();
  }, []);

  return (
    <BackOverrideContext
      value={{ hasBackOverride, setBackOverride, triggerBack }}
    >
      {children}
    </BackOverrideContext>
  );
}

export function useBackOverride() {
  return use(BackOverrideContext);
}
