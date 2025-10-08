// @inferEffectDependencies
import { useEffect } from "react";

function getScrollbarWidth() {
  // Create invisible container
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  document.body.appendChild(outer);

  // Create inner element
  const inner = document.createElement("div");
  outer.appendChild(inner);

  // Calculate scrollbar width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Clean up
  outer.remove();

  return scrollbarWidth;
}

interface UsePreventScrollOptions {
  isDisabled?: boolean;
}

/**
 * Prevents scrolling on the document body while enabled.
 * Works across all platforms including iOS Safari.
 *
 * - Preserves scroll position when locking/unlocking
 * - Prevents layout shift from scrollbar disappearing
 * - Uses position: fixed technique for iOS compatibility
 *
 * @param options - Configuration options
 * @param options.isDisabled - When true, scroll prevention is disabled
 *
 * @example
 * ```tsx
 * function Dialog({ isOpen }) {
 *   usePreventScroll({ isDisabled: !isOpen });
 *   return <dialog>...</dialog>;
 * }
 * ```
 */
export function usePreventScroll(options: UsePreventScrollOptions = {}): void {
  const { isDisabled = false } = options;

  useEffect(() => {
    if (isDisabled) {
      return;
    }

    // Store original values
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalPaddingRight = document.body.style.paddingRight;

    // Get current scroll position
    const scrollY = window.pageYOffset;
    const scrollbarWidth = getScrollbarWidth();

    // Apply scroll lock with iOS-compatible technique
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    // Prevent layout shift by compensating for scrollbar width
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Cleanup: restore original state
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  });
}
