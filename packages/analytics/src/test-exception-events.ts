import type { CaptureResult } from "posthog-js";

/** An error the drop hooks must never swallow. */
export const realError = {
  type: "TypeError",
  value: "movie.title is not a function",
  mechanism: { handled: false, synthetic: false, type: "generic" },
  stacktrace: {
    type: "raw",
    frames: [
      {
        platform: "web:javascript",
        filename: "https://qingqi.dev/_next/static/chunk.js",
        lineno: 1,
        colno: 42,
      },
    ],
  },
};

/** A `$exception` capture carrying the given exception list. */
export function exceptionEvent(exceptionList: unknown[]) {
  return {
    uuid: "01994f9c-0000-7000-8000-000000000000",
    event: "$exception",
    properties: { $exception_list: exceptionList },
  } satisfies CaptureResult;
}
