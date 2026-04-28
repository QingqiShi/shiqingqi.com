import { useCallback, useEffect, useState } from "react";

/**
 * Tracks whether an element is visible in the viewport using
 * IntersectionObserver.
 *
 * Returns a callback ref (`setRef`) so the observer re-attaches cleanly when
 * the consumer unmounts and remounts the observed element. A MutableRefObject
 * can't be tracked reactively — React doesn't notify when `.current` mutates
 * — so we take the element via a callback ref and key the observer off the
 * element state.
 */
export function useIsElementVisible() {
  const [isVisible, setIsVisible] = useState(true);
  const [el, setEl] = useState<HTMLElement | null>(null);

  // Reset optimistically to the default when the observed target changes —
  // the observer fires asynchronously, so without this the previous target's
  // final value would briefly persist and flash the wrong style on remount.
  const setRef = useCallback((node: HTMLElement | null) => {
    setEl((previous) => {
      if (previous !== node) {
        setIsVisible(true);
      }
      return node;
    });
  }, []);

  useEffect(() => {
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [el]);

  return { isVisible, setRef };
}
