const MAX_CAUSES = 5;
const SAFE_NAME = /^[\w$.-]{1,80}$/;
const SAFE_CODE = /^[A-Z0-9_]{1,40}$/;

function nameOf(value: unknown): string {
  if (value instanceof Error && SAFE_NAME.test(value.name)) return value.name;
  return typeof value;
}

function codeOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("code" in value)) {
    return null;
  }
  return typeof value.code === "string" && SAFE_CODE.test(value.code)
    ? value.code
    : null;
}

function isHttpStatus(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) < 600;
}

function statusOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  if ("statusCode" in value && isHttpStatus(value.statusCode)) {
    return `HTTP ${String(value.statusCode)}`;
  }
  if ("status" in value && isHttpStatus(value.status)) {
    return `HTTP ${String(value.status)}`;
  }
  return null;
}

function nextOf(value: unknown): unknown {
  if (!(value instanceof Error)) return undefined;
  if (value.cause !== undefined) return value.cause;
  // The AI SDK's RetryError keeps the last failure in `lastError`, not in `cause`.
  return "lastError" in value ? value.lastError : undefined;
}

/**
 * An error for a log: the name of each error along its `cause` chain, with a
 * code such as Postgres's SQLSTATE and an HTTP status. Never the message or
 * other fields: a query error's message holds every parameter of the query,
 * and a model error holds the prompt or the model's answer.
 */
export function describeError(error: unknown): string {
  const links: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSES && current != null; depth++) {
    const details = [codeOf(current), statusOf(current)].filter(
      (detail) => detail !== null,
    );
    links.push(
      details.length > 0
        ? `${nameOf(current)} (${details.join(", ")})`
        : nameOf(current),
    );
    current = nextOf(current);
  }
  return links.join(" < ");
}
