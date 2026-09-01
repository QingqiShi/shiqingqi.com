import { dropWhenEveryExceptionMatches } from "./drop-when-every-exception-matches";

// React's <ViewTransition> drives the browser view transition API. When an
// update lands mid-transition, the browser skips the old transition and
// rejects its promise with this AbortError. Nothing awaits that promise, so
// the unhandled rejection is benign: only the animation is skipped.
const skippedTransitionMessage = "AbortError: Transition was skipped";

function isSkippedTransitionError(exception: unknown) {
  if (typeof exception !== "object" || exception === null) return false;
  return (
    "type" in exception &&
    exception.type === "DOMException" &&
    "value" in exception &&
    exception.value === skippedTransitionMessage
  );
}

export const dropSkippedTransitionErrors = dropWhenEveryExceptionMatches(
  isSkippedTransitionError,
);
