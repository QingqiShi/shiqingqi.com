import { useLayoutEffect, useState } from "react";

/**
 * Whether `root` is at least as wide as `probe`, which is as wide as the
 * column and the least main content together: `null` until measured.
 *
 * @internal
 */
export function useSideColumnFits(
  root: HTMLElement | null,
  probe: HTMLElement | null,
) {
  const [fits, setFits] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (root === null || probe === null) return;
    if (typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = root.getBoundingClientRect().width;
      if (width === 0) return;
      setFits(width >= probe.getBoundingClientRect().width);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(probe);
    return () => {
      observer.disconnect();
    };
  }, [root, probe]);
  return fits;
}
