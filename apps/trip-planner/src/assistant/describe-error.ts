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

/**
 * An error for a log: the name of each error along its `cause` chain, and a
 * code such as Postgres's SQLSTATE. Never the message: a query error's
 * message holds every parameter of the query, such as a whole trip.
 */
export function describeError(error: unknown): string {
  const links: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSES && current != null; depth++) {
    const code = codeOf(current);
    links.push(code ? `${nameOf(current)} (${code})` : nameOf(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return links.join(" < ");
}
