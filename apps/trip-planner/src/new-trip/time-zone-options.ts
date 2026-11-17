import type { ComboboxOption } from "@tuja/ui/components/combobox";

/** The zone of the device, such as "Europe/Lisbon". */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Every time zone that the browser knows, with `extra` first where the
 * browser leaves it out, as it does "UTC" or an old name of a zone.
 */
export function knownTimeZones(extra: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes(extra) ? zones : [extra, ...zones];
}

/**
 * Each zone by its city, with its name in `locale` and its IANA id as the
 * detail, which a search also reads.
 */
export function timeZoneOptions(
  zones: readonly string[],
  locale: string,
): ComboboxOption[] {
  const now = new Date();
  return zones.map((zone) => {
    const city = (zone.split("/").at(-1) ?? zone).replaceAll("_", " ");
    const name = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      timeZoneName: "longGeneric",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value;
    return {
      id: zone,
      label: city,
      detail: name === undefined ? zone : `${name} · ${zone}`,
    };
  });
}
