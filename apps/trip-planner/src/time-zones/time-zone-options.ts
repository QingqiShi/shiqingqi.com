import type { ComboboxOption } from "@tuja/ui/components/combobox";
import { timeZoneLabel } from "./time-zone-label.ts";
import { timeZoneTable } from "./time-zone-table.ts";

function genericName(zone: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      timeZoneName: "longGeneric",
    })
      .formatToParts(0)
      .find((part) => part.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
}

const known = new Map<string, ComboboxOption[]>();

/**
 * Every time zone that the browser knows, with `current` in it, sorted by
 * city. The detail is the country and the name of the zone's time. A search
 * also finds a zone by its city and its country in the other language, and by
 * its IANA name.
 */
export function timeZoneOptions(
  locale: string,
  current: string,
): ComboboxOption[] {
  let options = known.get(locale);
  if (options === undefined) {
    options = buildOptions(locale, Object.keys(timeZoneTable));
    known.set(locale, options);
  }
  return options.some(({ id }) => id === current)
    ? options
    : [...buildOptions(locale, [current]), ...options];
}

function buildOptions(locale: string, zones: string[]): ComboboxOption[] {
  const other = locale === "zh" ? "en" : "zh";
  const countries = new Intl.DisplayNames(locale, { type: "region" });
  const otherCountries = new Intl.DisplayNames(other, { type: "region" });
  const options: ComboboxOption[] = [];
  for (const zone of zones) {
    const generic = genericName(zone, locale);
    if (generic === undefined && zones.length > 1) continue;
    const entry = timeZoneTable[zone];
    const code = entry?.[2] ?? "";
    const country = code === "" ? undefined : countries.of(code);
    const showsGeneric =
      generic !== undefined &&
      (country === undefined || !generic.includes(country));
    options.push({
      id: zone,
      label: timeZoneLabel(zone, locale),
      detail: [country, showsGeneric ? generic : undefined]
        .filter((part) => part !== undefined)
        .join(" · "),
      keywords: [
        entry?.[locale === "zh" ? 0 : 1],
        code === "" ? undefined : otherCountries.of(code),
        zone,
      ]
        .filter((part) => part !== undefined)
        .join(" "),
    });
  }
  const collator = new Intl.Collator(locale);
  return options.sort((a, b) => collator.compare(a.label, b.label));
}
