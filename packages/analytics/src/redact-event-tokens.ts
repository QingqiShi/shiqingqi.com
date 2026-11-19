import type { BeforeSendFn } from "posthog-js";
import { redactTokens } from "./redact-tokens";

function redactRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      redactTokens(key),
      redactValue(value),
    ]),
  );
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactTokens(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return redactRecord({ ...value });
  }
  return value;
}

/**
 * A `beforeSend` hook that removes tokens from every string and key of an
 * event, such as `$current_url`, `$pathname`, `$heatmap_data` and the message
 * of an exception. `properties.token` stays: it is the public key of the PostHog
 * project, and PostHog drops an event that has a different value there.
 */
export const redactEventTokens: BeforeSendFn = (event) => {
  const projectKey: unknown = event.properties.token;
  return {
    ...event,
    properties: {
      ...redactRecord(event.properties),
      ...(projectKey !== undefined && { token: projectKey }),
    },
    ...(event.$set && { $set: redactRecord(event.$set) }),
    ...(event.$set_once && { $set_once: redactRecord(event.$set_once) }),
  };
};
