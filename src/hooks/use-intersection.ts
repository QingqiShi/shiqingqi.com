import { useEffect } from "react";

interface Params {
  getElement: () => HTMLElement | null;
  onIntersect: () => void;
}

export function useIntersection({ getElement, onIntersect }: Params) {
  useEffect(() => {
    const element = getElement();
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect();
        }
      },
      { rootMargin: "0px 0px 500px 0px" }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [getElement, onIntersect]);
}
