import { timeZoneAliases, timeZoneTable } from "./time-zone-table.ts";

/** The current IANA name of a zone, such as "Asia/Kolkata" for "Asia/Calcutta". */
export function currentTimeZone(zone: string): string {
  return timeZoneAliases[zone] ?? zone;
}

/** The zone of the device by its current name, such as "Europe/Lisbon". */
export function deviceTimeZone(): string {
  return currentTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * The name of a time zone that a person reads: its city in `locale`, such
 * as "Tokyo", or "东京" in Chinese, for "Asia/Tokyo". An old name of a zone
 * gets the city of its current name.
 */
export function timeZoneLabel(zone: string, locale: string): string {
  const current = currentTimeZone(zone);
  const entry = timeZoneTable[current];
  if (entry) return locale === "zh" ? entry[1] : entry[0];
  return (current.split("/").at(-1) ?? current).replaceAll("_", " ");
}
