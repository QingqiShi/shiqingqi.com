import type { BeforeSendFn } from "posthog-js";

/**
 * Builds a `beforeSend` hook that drops an exception event when `matches`
 * accepts every entry in its list. One entry it does not accept keeps the whole
 * event, because a real error alongside the noise is still worth reporting.
 */
export function dropWhenEveryExceptionMatches(
  matches: (exception: unknown) => boolean,
): BeforeSendFn {
  return (event) => {
    if (!event || event.event !== "$exception") return event;
    const exceptions: unknown = event.properties.$exception_list;
    return Array.isArray(exceptions) &&
      exceptions.length > 0 &&
      exceptions.every(matches)
      ? null
      : event;
  };
}
