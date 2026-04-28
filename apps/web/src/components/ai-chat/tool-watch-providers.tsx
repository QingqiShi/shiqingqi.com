"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { buildSrcSet } from "#src/utils/tmdb-image.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { isRecord } from "#src/utils/type-guards.ts";
import { ExternalLinkIndicator } from "../shared/external-link-indicator";

interface ProviderEntry {
  id: number;
  name: string;
  logoPath: string;
}

interface WatchProviderData {
  type: "region";
  id: number;
  mediaType: "movie" | "tv";
  region: string;
  providers: {
    link: string | null;
    flatrate: ProviderEntry[];
    rent: ProviderEntry[];
    buy: ProviderEntry[];
    ads: ProviderEntry[];
    free: ProviderEntry[];
  } | null;
}

type AvailabilityType = "flatrate" | "rent" | "buy" | "ads" | "free";

interface ProviderSearchData {
  type: "providerSearch";
  id: number;
  mediaType: "movie" | "tv";
  providerName: string;
  providerLogoPath: string | null;
  regions: Array<{
    country: string;
    types: AvailabilityType[];
  }>;
}

export type WatchProviderOutput = WatchProviderData | ProviderSearchData;

type ProviderCategory = "flatrate" | "free" | "ads" | "rent" | "buy";

const CATEGORY_KEYS: ReadonlyArray<ProviderCategory> = [
  "flatrate",
  "free",
  "ads",
  "rent",
  "buy",
];

function parseProviderEntry(entry: unknown): ProviderEntry | null {
  if (!isRecord(entry)) return null;
  if (typeof entry.id !== "number") return null;
  if (typeof entry.name !== "string") return null;
  if (typeof entry.logoPath !== "string") return null;
  return { id: entry.id, name: entry.name, logoPath: entry.logoPath };
}

function parseProviderList(list: unknown): ProviderEntry[] {
  if (!Array.isArray(list)) return [];
  const entries: ProviderEntry[] = [];
  for (const item of list) {
    const parsed = parseProviderEntry(item);
    if (parsed) entries.push(parsed);
  }
  return entries;
}

function parseRegionData(
  output: Record<string, unknown>,
  id: number,
  mediaType: "movie" | "tv",
): WatchProviderData | null {
  if (typeof output.region !== "string") return null;

  if (output.providers === null || output.providers === undefined) {
    return {
      type: "region",
      id,
      mediaType,
      region: output.region,
      providers: null,
    };
  }

  if (!isRecord(output.providers)) return null;

  return {
    type: "region",
    id,
    mediaType,
    region: output.region,
    providers: {
      link:
        typeof output.providers.link === "string"
          ? output.providers.link
          : null,
      flatrate: parseProviderList(output.providers.flatrate),
      rent: parseProviderList(output.providers.rent),
      buy: parseProviderList(output.providers.buy),
      ads: parseProviderList(output.providers.ads),
      free: parseProviderList(output.providers.free),
    },
  };
}

function parseAvailabilityType(value: unknown): AvailabilityType | null {
  if (
    value === "flatrate" ||
    value === "rent" ||
    value === "buy" ||
    value === "ads" ||
    value === "free"
  ) {
    return value;
  }
  return null;
}

function parseProviderSearchData(
  output: Record<string, unknown>,
  id: number,
  mediaType: "movie" | "tv",
): ProviderSearchData | null {
  if (typeof output.providerName !== "string") return null;
  if (!Array.isArray(output.regions)) return null;

  const regions: ProviderSearchData["regions"] = [];
  for (const raw of output.regions) {
    if (!isRecord(raw)) continue;
    if (typeof raw.country !== "string") continue;
    if (!Array.isArray(raw.types)) continue;

    const types: AvailabilityType[] = [];
    for (const typeValue of raw.types) {
      const parsed = parseAvailabilityType(typeValue);
      if (parsed) types.push(parsed);
    }

    if (types.length > 0) {
      regions.push({ country: raw.country, types });
    }
  }

  return {
    type: "providerSearch",
    id,
    mediaType,
    providerName: output.providerName,
    providerLogoPath:
      typeof output.providerLogoPath === "string"
        ? output.providerLogoPath
        : null,
    regions,
  };
}

export function parseWatchProviderOutput(
  output: unknown,
): WatchProviderOutput | null {
  if (!isRecord(output)) return null;
  if (typeof output.id !== "number") return null;
  if (output.mediaType !== "movie" && output.mediaType !== "tv") return null;

  const id = output.id;
  const mediaType = output.mediaType;

  // Provider search variant (providerName + regions)
  if ("providerName" in output) {
    return parseProviderSearchData(output, id, mediaType);
  }

  // Region-specific variant (region + providers)
  return parseRegionData(output, id, mediaType);
}

const LOGO_SIZE = 36;
const HEADER_LOGO_SIZE = 20;

function ProviderLogo({
  logoPath,
  name,
  size = LOGO_SIZE,
}: {
  logoPath: string;
  name: string;
  size?: number;
}) {
  const { data: config } = useSuspenseQuery(tmdbQueries.configuration);

  const baseUrl =
    config.images?.secure_base_url ?? config.images?.base_url ?? "";
  const logoSizes = config.images?.logo_sizes ?? [];

  if (!baseUrl || !logoPath) return null;

  const { src, srcSet } = buildSrcSet(baseUrl, logoSizes, logoPath);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      css={styles.logo}
      src={src}
      srcSet={srcSet}
      sizes={`${String(size)}px`}
      alt={name}
      title={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  );
}

function TypeLabel({ type }: { type: AvailabilityType }) {
  switch (type) {
    case "flatrate":
      return t({ en: "Stream", zh: "订阅" });
    case "free":
      return t({ en: "Free", zh: "免费" });
    case "ads":
      return t({ en: "Ads", zh: "含广告" });
    case "rent":
      return t({ en: "Rent", zh: "租借" });
    case "buy":
      return t({ en: "Buy", zh: "购买" });
  }
}

function ProviderSection({
  type,
  providers,
}: {
  type: ProviderCategory;
  providers: ReadonlyArray<ProviderEntry>;
}) {
  if (providers.length === 0) return null;
  return (
    <div css={styles.section}>
      <div css={styles.sectionLabel}>
        <TypeLabel type={type} />
      </div>
      <div css={[flex.wrap, styles.logoRow]}>
        {providers.map((p) => (
          <ProviderLogo key={p.id} logoPath={p.logoPath} name={p.name} />
        ))}
      </div>
    </div>
  );
}

function RegionWatchProviders({ data }: { data: WatchProviderData }) {
  const { region, providers } = data;
  const locale = useLocale();
  const displayNames = getRegionDisplayNames(locale);
  const regionDisplay = displayNames?.of(region) ?? region;

  return (
    <div css={styles.card}>
      <div css={[flex.between, styles.header]}>
        <span css={styles.title}>
          {t({ en: "Where to Watch", zh: "在哪里看" })}
        </span>
        <span css={styles.regionBadge}>{regionDisplay}</span>
      </div>

      {providers === null ? (
        <p css={styles.emptyText}>
          {t({ en: "Not available in ", zh: "在" })}
          {regionDisplay}
          {t({ en: "", zh: "不可用" })}
        </p>
      ) : (
        <>
          {CATEGORY_KEYS.map((key) => (
            <ProviderSection key={key} type={key} providers={providers[key]} />
          ))}
        </>
      )}

      <div css={styles.attribution}>
        {providers?.link ? (
          <a
            href={providers.link}
            target="_blank"
            rel="noopener noreferrer"
            css={styles.attributionLink}
          >
            {t({
              en: "Data provided by JustWatch",
              zh: "数据由 JustWatch 提供",
            })}
            <ExternalLinkIndicator />
          </a>
        ) : (
          <span>
            {t({
              en: "Data provided by JustWatch",
              zh: "数据由 JustWatch 提供",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

function groupRegionsByType(regions: ProviderSearchData["regions"]) {
  const groups = new Map<AvailabilityType, string[]>();
  for (const region of regions) {
    for (const type of region.types) {
      const list = groups.get(type);
      if (list) {
        list.push(region.country);
      } else {
        groups.set(type, [region.country]);
      }
    }
  }
  return groups;
}

function getRegionDisplayNames(locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    return null;
  }
}

const INITIAL_VISIBLE_COUNT = 8;

function CountryList({ countries }: { countries: ReadonlyArray<string> }) {
  const [expanded, setExpanded] = useState(false);
  const locale = useLocale();
  const displayNames = getRegionDisplayNames(locale);

  const needsTruncation = countries.length > INITIAL_VISIBLE_COUNT;
  const visible =
    expanded || !needsTruncation
      ? countries
      : countries.slice(0, INITIAL_VISIBLE_COUNT);
  const remaining = countries.length - INITIAL_VISIBLE_COUNT;

  return (
    <p css={styles.countryList}>
      {visible.map((code, i) => (
        <Fragment key={code}>
          {i > 0 && " · "}
          <span>{displayNames?.of(code) ?? code}</span>
        </Fragment>
      ))}
      {!expanded && needsTruncation && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
            }}
            css={styles.showMoreButton}
          >
            {`+${String(remaining)} `}
            {t({ en: "more", zh: "更多" })}
          </button>
        </>
      )}
    </p>
  );
}

function ProviderSearchResults({ data }: { data: ProviderSearchData }) {
  const { providerName, providerLogoPath, regions } = data;
  const groups = groupRegionsByType(regions);

  return (
    <div css={styles.card}>
      <div css={[flex.between, styles.header]}>
        <div css={[flex.row, styles.headerTitle]}>
          {providerLogoPath && (
            <ProviderLogo
              logoPath={providerLogoPath}
              name={providerName}
              size={HEADER_LOGO_SIZE}
            />
          )}
          <span css={styles.title}>{providerName}</span>
        </div>
        <span css={styles.regionBadge}>
          {regions.length === 1
            ? t({ en: "1 region", zh: "1 个地区" })
            : `${String(regions.length)} ${t({ en: "regions", zh: "个地区" })}`}
        </span>
      </div>

      {regions.length === 0 ? (
        <p css={styles.emptyText}>
          {t({
            en: "Not available on ",
            zh: "在 ",
          })}
          {providerName}
          {t({
            en: " in any region",
            zh: " 上不可用",
          })}
        </p>
      ) : (
        <div css={styles.typeGroups}>
          {CATEGORY_KEYS.map((key) => {
            const countries = groups.get(key);
            if (!countries) return null;
            return (
              <div key={key}>
                <div css={styles.typeLabel}>
                  <TypeLabel type={key} />
                </div>
                <CountryList countries={countries} />
              </div>
            );
          })}
        </div>
      )}

      <div css={styles.attribution}>
        <span>
          {t({
            en: "Data provided by JustWatch",
            zh: "数据由 JustWatch 提供",
          })}
        </span>
      </div>
    </div>
  );
}

export function ToolWatchProviders({ data }: { data: WatchProviderOutput }) {
  if (data.type === "providerSearch") {
    return <ProviderSearchResults data={data} />;
  }
  return <RegionWatchProviders data={data} />;
}

const styles = stylex.create({
  card: {
    backgroundColor: color.backgroundHover,
    borderRadius: border.radius_2,
    padding: space._3,
    marginTop: space._2,
  },
  header: {
    marginBottom: space._2,
  },
  headerTitle: {
    gap: space._1,
  },
  title: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
  },
  regionBadge: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_1,
    paddingInline: space._1,
    paddingBlock: space._00,
  },
  section: {
    marginBottom: space._2,
  },
  sectionLabel: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    marginBottom: space._1,
  },
  logoRow: {
    gap: space._1,
  },
  logo: {
    borderRadius: border.radius_1,
    objectFit: "cover",
  },
  emptyText: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
    paddingBlock: space._1,
  },
  typeGroups: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  typeLabel: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontWeight: font.weight_6,
    marginBottom: space._1,
  },
  countryList: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
  },
  showMoreButton: {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    cursor: "pointer",
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
  },
  attribution: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    marginTop: space._1,
    paddingTop: space._1,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
  attributionLink: {
    color: color.textMuted,
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
  },
});
