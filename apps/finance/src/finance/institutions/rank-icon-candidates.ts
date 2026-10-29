import type { IconCandidate, IconSource } from "./icon-candidate.ts";
import { APPLE_TOUCH_ICON_SIZE } from "./read-homepage-links.ts";

const SOURCE_ORDER: IconSource[] = [
  "apple-touch-icon",
  "manifest",
  "root-apple-touch-icon",
  "icon",
  "favicon-ico",
];

/** The well-known icon paths at the root of `origin`. */
export function rootIconCandidates(origin: URL): IconCandidate[] {
  return [
    {
      url: new URL("/apple-touch-icon.png", origin),
      size: APPLE_TOUCH_ICON_SIZE,
      source: "root-apple-touch-icon",
    },
    { url: new URL("/favicon.ico", origin), size: 0, source: "favicon-ico" },
  ];
}

function compareCandidates(a: IconCandidate, b: IconCandidate) {
  const icoA = a.source === "favicon-ico" ? 1 : 0;
  const icoB = b.source === "favicon-ico" ? 1 : 0;
  return (
    icoA - icoB ||
    b.size - a.size ||
    SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source)
  );
}

/** Each URL once, `.ico` last, then the largest declared size and the most trusted source first. */
export function rankIconCandidates(
  candidates: IconCandidate[],
): IconCandidate[] {
  const byUrl = new Map<string, IconCandidate>();
  for (const candidate of candidates) {
    const known = byUrl.get(candidate.url.href);
    if (known === undefined || compareCandidates(candidate, known) < 0) {
      byUrl.set(candidate.url.href, candidate);
    }
  }
  return [...byUrl.values()].sort(compareCandidates);
}
