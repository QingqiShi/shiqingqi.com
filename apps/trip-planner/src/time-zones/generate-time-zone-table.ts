/**
 * Writes `time-zone-table.ts` from CLDR: the city of each time zone in
 * English and in Chinese, its country, and the old names of each zone. Run
 * it with `pnpm --filter trip-planner time-zones:generate` when the CLDR of
 * Node moves on (`process.versions.cldr`).
 */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const CLDR = "48.0.0";
const base = "https://cdn.jsdelivr.net/npm";

interface BcpZone {
  _alias?: string;
  _iana?: string;
  _region?: string;
  _deprecated?: boolean;
}

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${base}/${path}`);
  if (!response.ok) throw new Error(`${path}: ${String(response.status)}`);
  return (await response.json()) as T;
}

async function cities(locale: string) {
  const file = await json<{
    main: Partial<
      Record<string, { dates: { timeZoneNames: { zone: unknown } } }>
    >;
  }>(`cldr-dates-full@${CLDR}/main/${locale}/timeZoneNames.json`);
  const tree = file.main[locale]?.dates.timeZoneNames.zone;
  return (zone: string): string | undefined => {
    let node: unknown = tree;
    for (const part of zone.split("/")) {
      if (typeof node !== "object" || node === null) return undefined;
      node = Reflect.get(node, part);
    }
    if (typeof node !== "object" || node === null) return undefined;
    const city: unknown = Reflect.get(node, "exemplarCity");
    return typeof city === "string" ? city : undefined;
  };
}

const bcp = await json<{ keyword: { u: { tz: Record<string, BcpZone> } } }>(
  `cldr-bcp47@${CLDR}/bcp47/timezone.json`,
);
const enCity = await cities("en");
const zhCity = await cities("zh");

const table: Record<string, [string, string, string]> = {};
const aliases: Record<string, string> = {};
for (const [id, zone] of Object.entries(bcp.keyword.u.tz)) {
  if (id.startsWith("_") || zone._deprecated === true) continue;
  if (id !== "utc" && /^(utc|gmt|unk)/.test(id)) continue;
  const names = (zone._alias ?? "").split(" ").filter((name) => name !== "");
  const cldrName = names.at(0);
  if (cldrName === undefined) continue;
  const current = zone._iana ?? cldrName;
  if (id === "utc") {
    table[current] = ["UTC", "UTC", ""];
  } else {
    const fallback = (current.split("/").at(-1) ?? current).replaceAll(
      "_",
      " ",
    );
    const en = enCity(cldrName) ?? fallback;
    table[current] = [
      en,
      zhCity(cldrName) ?? en,
      (zone._region ?? id.slice(0, 2)).toUpperCase(),
    ];
  }
  for (const name of names) {
    if (name !== current && (name.includes("/") || name === "UTC")) {
      aliases[name] = current;
    }
  }
}

const sorted = <T>(record: Record<string, T>) =>
  Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : 1)),
  );

const out = new URL("time-zone-table.ts", import.meta.url).pathname;
await writeFile(
  out,
  `// Made by generate-time-zone-table.ts from CLDR ${CLDR}. Do not change it by hand.

/** Each time zone by its current IANA name: its city in English and in Chinese, and its country, empty for UTC. */
export const timeZoneTable: Readonly<
  Partial<Record<string, readonly [en: string, zh: string, country: string]>>
> = ${JSON.stringify(sorted(table))};

/** The old names of time zones, which some browsers still give, to the current name. */
export const timeZoneAliases: Readonly<Partial<Record<string, string>>> = ${JSON.stringify(sorted(aliases))};
`,
);
execFileSync("pnpm", ["exec", "prettier", "--write", out], {
  stdio: "inherit",
});
