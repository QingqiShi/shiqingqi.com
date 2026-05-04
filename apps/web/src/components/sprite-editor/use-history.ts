"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface HistoryState<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
}

/**
 * Generic linear undo/redo history. Pass an initial value; the hook returns
 * `[present, push, replace, undo, redo, canUndo, canRedo, reset]`.
 *
 * `push` appends a new entry, discarding the redo stack — standard editor
 * behavior. `replace` updates `present` in-place without growing `past`,
 * which lets a continuous user gesture (e.g. a pencil drag) coalesce into a
 * single undo step: call `push` for the gesture's first frame, then
 * `replace` for every subsequent frame. `reset` replaces the entire history
 * (e.g. when the user opens a different cell to edit).
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });
  // Latest value, also exposed as a ref so callbacks can read it without
  // closing over a stale snapshot.
  const presentRef = useRef(initial);
  useEffect(() => {
    presentRef.current = state.present;
  }, [state.present]);

  const push = useCallback((next: T) => {
    setState((prev) => ({
      past: [...prev.past, prev.present],
      present: next,
      future: [],
    }));
  }, []);

  const replace = useCallback((next: T) => {
    setState((prev) => ({
      past: prev.past,
      present: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((next: T) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  return {
    present: state.present,
    presentRef,
    push,
    replace,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    reset,
  };
}
