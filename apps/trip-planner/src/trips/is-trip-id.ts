const TRIP_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True for the shape of a trip's id, which is its path: a uuid as Postgres writes it. */
export function isTripId(value: string): boolean {
  return TRIP_ID.test(value);
}
