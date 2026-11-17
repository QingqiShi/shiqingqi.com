const EDIT_ROLES: readonly string[] = ["owner", "editor"];

/**
 * Whether a member with this role can change the trip. The database is the
 * guard (`trips_save`); this decides only what the pages offer. A role that
 * is not in the list, such as a later role that only reads, cannot.
 */
export function canEditTrip(role: string): boolean {
  return EDIT_ROLES.includes(role);
}
