import { lookup as dnsLookup } from "node:dns/promises";
import sharp from "sharp";
import { isInstitutionDomain } from "../domain/accounts/parse-institution-domain.ts";
import { decodableImages, type DecodableImage } from "./decodable-images.ts";
import {
  fetchPublicResource,
  type LookupAddresses,
  type PublicFetchPolicy,
  type ResourceLimits,
} from "./fetch-public-resource.ts";
import type { IconCandidate } from "./icon-candidate.ts";
import { isPublicAddress } from "./is-public-address.ts";
import {
  rankIconCandidates,
  rootIconCandidates,
} from "./rank-icon-candidates.ts";
import { readHomepageLinks } from "./read-homepage-links.ts";
import { readManifestIcons } from "./read-manifest-icons.ts";

export type {
  LookupAddresses,
  ResolvedAddress,
} from "./fetch-public-resource.ts";

export const INSTITUTION_ICON_SIZE = 128;

const TOTAL_TIMEOUT_MS = 20_000;
const MAX_INPUT_PIXELS = 4096 * 4096;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const FALLBACK_MANIFEST_PATHS = [
  "/manifest.json",
  "/site.webmanifest",
  "/manifest.webmanifest",
];

const HTML_LIMITS: ResourceLimits = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  maxBytes: 1024 * 1024,
  onOverflow: "truncate",
};

const MANIFEST_LIMITS: ResourceLimits = {
  accept: "application/manifest+json,application/json;q=0.9,*/*;q=0.8",
  maxBytes: 1024 * 1024,
  onOverflow: "reject",
};

const IMAGE_LIMITS: ResourceLimits = {
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  maxBytes: 2 * 1024 * 1024,
  onOverflow: "reject",
};

export interface FetchInstitutionIconOptions {
  signal?: AbortSignal;
  /** Test seams only; production uses the defaults. */
  homepageUrl?: (domain: string) => string;
  lookup?: LookupAddresses;
  isAllowedAddress?: (address: string, family: 4 | 6) => boolean;
}

function defaultHomepageUrl(domain: string) {
  return `https://${domain}/`;
}

async function lookupAll(hostname: string) {
  const addresses = await dnsLookup(hostname, { all: true, order: "verbatim" });
  return addresses.map(({ address, family }) => ({
    address,
    family: family === 6 ? (6 as const) : (4 as const),
  }));
}

async function fetchManifestIcons(
  manifests: URL[],
  pageUrl: URL,
  policy: PublicFetchPolicy,
) {
  const urls =
    manifests.length > 0
      ? manifests.slice(0, 1)
      : FALLBACK_MANIFEST_PATHS.map((path) => new URL(path, pageUrl));
  for (const url of urls) {
    const manifest = await fetchPublicResource(url, policy, MANIFEST_LIMITS);
    if (manifest === null) continue;
    const icons = readManifestIcons(
      Buffer.from(manifest.body).toString("utf8"),
      manifest.url,
    );
    if (icons.length > 0) return icons;
  }
  return [];
}

async function collectCandidates(
  homepage: URL,
  policy: PublicFetchPolicy,
): Promise<IconCandidate[]> {
  const page = await fetchPublicResource(homepage, policy, HTML_LIMITS);
  if (page === null) return rootIconCandidates(homepage);
  const links = readHomepageLinks(
    Buffer.from(page.body).toString("utf8"),
    page.url,
  );
  const manifestIcons = await fetchManifestIcons(
    links.manifests,
    page.url,
    policy,
  );
  return [...links.icons, ...manifestIcons, ...rootIconCandidates(page.url)];
}

async function toInstitutionIcon(image: DecodableImage) {
  try {
    const bytes = await sharp(image.data, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
      ...(image.kind === "rgba"
        ? { raw: { width: image.width, height: image.height, channels: 4 } }
        : {}),
    })
      .autoOrient()
      .resize(INSTITUTION_ICON_SIZE, INSTITUTION_ICON_SIZE, {
        fit: "contain",
        position: "centre",
        background: WHITE,
      })
      .flatten({ background: WHITE })
      .webp({ quality: 90 })
      .toBuffer();
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

async function fetchCandidate(url: URL, policy: PublicFetchPolicy) {
  const resource = await fetchPublicResource(url, policy, IMAGE_LIMITS);
  if (resource === null) return null;
  for (const image of decodableImages(resource.body)) {
    const icon = await toInstitutionIcon(image);
    if (icon) return icon;
  }
  return null;
}

/** The website icon of `domain` as an opaque WebP image, INSTITUTION_ICON_SIZE square, or null when the site has none we can use. */
export async function fetchInstitutionIcon(
  domain: string,
  options: FetchInstitutionIconOptions = {},
): Promise<Uint8Array | null> {
  if (!isInstitutionDomain(domain)) {
    throw new RangeError(`"${domain}" is not a lowercase public host name`);
  }
  const homepage = new URL((options.homepageUrl ?? defaultHomepageUrl)(domain));
  const policy: PublicFetchPolicy = {
    lookup: options.lookup ?? lookupAll,
    isAllowedAddress: options.isAllowedAddress ?? isPublicAddress,
    allowedPorts: new Set(["", homepage.port]),
    endsAt: Date.now() + TOTAL_TIMEOUT_MS,
    signal: options.signal,
  };

  const candidates = await collectCandidates(homepage, policy);
  for (const candidate of rankIconCandidates(candidates)) {
    if (Date.now() >= policy.endsAt) return null;
    const icon = await fetchCandidate(candidate.url, policy);
    if (icon) return icon;
  }
  return null;
}
