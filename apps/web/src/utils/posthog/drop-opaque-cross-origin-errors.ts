import { dropWhenEveryExceptionMatches } from "./drop-when-every-exception-matches";

// The browser hides an uncaught error thrown by another origin's script behind
// a synthetic "Script error." with no stack, so it names no code in this app.
const opaqueCrossOriginMessage = "Script error.";

function isOpaqueCrossOriginError(exception: unknown) {
  if (typeof exception !== "object" || exception === null) return false;
  if (
    !("value" in exception) ||
    exception.value !== opaqueCrossOriginMessage ||
    !("mechanism" in exception)
  ) {
    return false;
  }
  const { mechanism } = exception;
  return (
    typeof mechanism === "object" &&
    mechanism !== null &&
    "synthetic" in mechanism &&
    mechanism.synthetic === true
  );
}

export const dropOpaqueCrossOriginErrors = dropWhenEveryExceptionMatches(
  isOpaqueCrossOriginError,
);
