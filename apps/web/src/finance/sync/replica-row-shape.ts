/**
 * Bump when a synced row gains or loses a field, or a field changes meaning,
 * so that every device fetches its rows again in the new shape and the
 * server asks a tab that runs older code to reload. The Outbox stays.
 * Raising `DB_VERSION` instead would delete the Outbox.
 */
export const REPLICA_ROW_SHAPE = 9;

export const ROW_SHAPE_HEADER = "X-Finance-Row-Shape";

/**
 * The row shape of code that sends no `ROW_SHAPE_HEADER`. It must stay 7
 * when `REPLICA_ROW_SHAPE` moves, because it is the shape of the code before
 * the header.
 */
export const HEADERLESS_ROW_SHAPE = 7;

export const ROW_SHAPE_MISMATCH_STATUS = 426;

export function readRowShape(headers: Headers): number | undefined {
  const value = headers.get(ROW_SHAPE_HEADER);
  if (value === null) return HEADERLESS_ROW_SHAPE;
  return /^\d{1,6}$/.test(value) ? Number(value) : undefined;
}
