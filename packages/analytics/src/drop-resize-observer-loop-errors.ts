import { dropWhenEveryExceptionMatches } from "./drop-when-every-exception-matches";

// Chrome reports this when a ResizeObserver callback changes layout in the
// same frame. The browser delivers the remaining notifications on the next
// frame, so nothing breaks. The event has no stack, so it cannot name a
// component to fix.
const resizeObserverLoopMessage =
  "ResizeObserver loop completed with undelivered notifications.";

function isResizeObserverLoopError(exception: unknown) {
  if (typeof exception !== "object" || exception === null) return false;
  return "value" in exception && exception.value === resizeObserverLoopMessage;
}

export const dropResizeObserverLoopErrors = dropWhenEveryExceptionMatches(
  isResizeObserverLoopError,
);
