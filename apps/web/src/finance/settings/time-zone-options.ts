interface TimeZoneOption {
  value: string;
  /** The UTC offset now, then the zone: "UTC+01:00 · Europe/London". */
  label: string;
}

interface TimeZoneOptions {
  common: TimeZoneOption[];
  others: TimeZoneOption[];
}

const COMMON_ZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

/** Old zone names that ICU still lists, and the current name of each. */
const RENAMED: Readonly<Record<string, string>> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Coral_Harbour": "America/Atikokan",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

const offsetFormats = new Map<string, Intl.DateTimeFormat>();

function offsetFormatOf(zone: string): Intl.DateTimeFormat {
  let format = offsetFormats.get(zone);
  if (format === undefined) {
    format = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "longOffset",
    });
    offsetFormats.set(zone, format);
  }
  return format;
}

function offsetOf(zone: string, now: Date): string {
  const name =
    offsetFormatOf(zone)
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return name === "GMT" ? "UTC" : name.replace("GMT", "UTC");
}

function optionOf(zone: string, now: Date): TimeZoneOption {
  return {
    value: zone,
    label:
      zone === "UTC"
        ? zone
        : `${offsetOf(zone, now)} · ${zone.replaceAll("_", " ")}`,
  };
}

/**
 * The timezones for the Household select: common zones first, then every
 * other zone by name, each with its UTC offset at `now`. Old ICU names show
 * as their current name. `current` is always in the list.
 */
export function timeZoneOptions(
  current: string,
  supported: readonly string[],
  now: Date = new Date(),
): TimeZoneOptions {
  const common = COMMON_ZONES.filter(
    (zone) => zone === "UTC" || supported.includes(zone),
  );
  const others = new Set(
    supported
      .map((zone) => RENAMED[zone] ?? zone)
      .filter((zone) => !common.includes(zone)),
  );
  if (!common.includes(current)) others.add(current);
  return {
    common: common.map((zone) => optionOf(zone, now)),
    others: [...others]
      .sort((a, b) => a.localeCompare(b))
      .map((zone) => optionOf(zone, now)),
  };
}
