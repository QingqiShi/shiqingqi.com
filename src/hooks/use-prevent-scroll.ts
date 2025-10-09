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

// Store state for scroll lock management
let scrollY = 0;
let originalOverflow = "";
let originalPosition = "";
let originalTop = "";
let originalWidth = "";
let originalPaddingRight = "";
let lockCount = 0;

/**
 * Enables body scroll lock.
 * Works across all platforms including iOS Safari.
 *
 * - Preserves scroll position when locking
 * - Prevents layout shift from scrollbar disappearing
 * - Uses position: fixed technique for iOS compatibility
 * - Supports multiple simultaneous locks (reference counted)
 *
 * Must be paired with `disableBodyScrollLock()` to restore scrolling.
 *
 * @example
 * ```tsx
 * function handleDialogOpen() {
 *   enableBodyScrollLock();
 * }
 * ```
 */
export function enableBodyScrollLock(): void {
  lockCount++;

  // Only apply lock styles on first lock
  if (lockCount === 1) {
    // Store original values
    originalOverflow = document.body.style.overflow;
    originalPosition = document.body.style.position;
    originalTop = document.body.style.top;
    originalWidth = document.body.style.width;
    originalPaddingRight = document.body.style.paddingRight;

    // Get current scroll position
    scrollY = window.pageYOffset;
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
  }
}

/**
 * Disables body scroll lock and restores scroll position.
 *
 * Must be called the same number of times as `enableBodyScrollLock()`
 * to fully restore scrolling (reference counted).
 *
 * @example
 * ```tsx
 * function handleDialogClose() {
 *   disableBodyScrollLock();
 * }
 * ```
 */
export function disableBodyScrollLock(): void {
  if (lockCount === 0) {
    return;
  }

  lockCount--;

  // Only restore when all locks are released
  if (lockCount === 0) {
    // Restore original state
    document.body.style.overflow = originalOverflow;
    document.body.style.position = originalPosition;
    document.body.style.top = originalTop;
    document.body.style.width = originalWidth;
    document.body.style.paddingRight = originalPaddingRight;

    // Restore scroll position
    window.scrollTo(0, scrollY);
  }
}
