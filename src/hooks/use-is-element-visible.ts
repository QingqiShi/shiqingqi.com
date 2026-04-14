import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks whether a referenced element is visible in the viewport using
 * IntersectionObserver.
 */
export function useIsElementVisible(
  ref: RefObject<HTMLElement | null>,
): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
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
  }, [ref]);

  return isVisible;
}
