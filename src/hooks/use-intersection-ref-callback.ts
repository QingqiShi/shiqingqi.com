import useEventCallback from "@mui/utils/useEventCallback";
import { useRef } from "react";

interface Params {
  onIntersect: (entries: IntersectionObserverEntry[]) => void;
  rootMargin?: string;
}

export function useIntersectionRefCallback<Element extends HTMLElement>({
  onIntersect,
  rootMargin,
}: Params) {
  const handleIntersect = useEventCallback(onIntersect);

  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  return (element: Element) => {
    if (!intersectionObserverRef.current) {
      intersectionObserverRef.current = new IntersectionObserver(
        handleIntersect,
        { rootMargin }
      );
    }
    intersectionObserverRef.current.observe(element);
    return () => {
      intersectionObserverRef.current?.unobserve(element);
    };
  };
}
