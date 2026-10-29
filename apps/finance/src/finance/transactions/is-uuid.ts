const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a UUID, in any letter case. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
