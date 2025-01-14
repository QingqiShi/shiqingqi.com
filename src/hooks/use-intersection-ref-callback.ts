import { useLayoutEffect, useRef } from "react";

interface Params {
  onIntersect: (entries: IntersectionObserverEntry[]) => void;
  rootMargin?: string;
}

export function useIntersectionRefCallback<Element extends HTMLElement>({
  onIntersect,
  rootMargin,
}: Params) {
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  useLayoutEffect(() => {
    if (!intersectionObserverRef.current) {
      intersectionObserverRef.current = new IntersectionObserver(onIntersect, {
        rootMargin,
      });
    }
    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [onIntersect, rootMargin]);

  return (element: Element) => {
    intersectionObserverRef.current?.observe(element);
    return () => {
      intersectionObserverRef.current?.unobserve(element);
    };
  };
}
