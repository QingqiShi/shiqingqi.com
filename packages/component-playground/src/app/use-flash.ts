import { useCallback, useEffect, useRef, useState } from "react";

/** Shows a word for a moment after an action, then clears it. */
export function useFlash(): [string | null, (word: string) => void] {
  const [word, setWord] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const flash = useCallback((next: string) => {
    setWord(next);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setWord(null);
    }, 1600);
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );
  return [word, flash];
}
