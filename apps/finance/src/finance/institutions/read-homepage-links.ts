import {
  iconCandidate,
  resolveHttpUrl,
  type IconCandidate,
  type IconSource,
} from "./icon-candidate.ts";

export interface HomepageLinks {
  icons: IconCandidate[];
  manifests: URL[];
}

/** An apple-touch-icon without `sizes` is the iOS home-screen icon, which is 180 px today. */
export const APPLE_TOUCH_ICON_SIZE = 180;

const MARKUP =
  /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>|<(link|base)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
const ATTRIBUTES = /([^\s"'<>/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
const ENTITIES = /&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt);/gi;

const MAX_CODE_POINT = 0x10ffff;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeEntities(value: string) {
  return value.replace(ENTITIES, (whole, name: string) => {
    const lower = name.toLowerCase();
    if (!lower.startsWith("#")) return NAMED_ENTITIES[lower] ?? whole;
    const codePoint = lower.startsWith("#x")
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    return codePoint <= MAX_CODE_POINT
      ? String.fromCodePoint(codePoint)
      : whole;
  });
}

function unquote(value: string) {
  const quote = value[0];
  return (quote === '"' || quote === "'") && value.endsWith(quote)
    ? value.slice(1, -1)
    : value;
}

function readAttributes(source: string) {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTES)) {
    const name = match[1].toLowerCase();
    if (attributes.has(name)) continue;
    const value = match.at(2) ?? "";
    attributes.set(name, decodeEntities(unquote(value)).trim());
  }
  return attributes;
}

function sourceOfRel(rel: string): IconSource | null {
  const tokens = rel.toLowerCase().split(/\s+/);
  if (
    tokens.includes("apple-touch-icon") ||
    tokens.includes("apple-touch-icon-precomposed")
  ) {
    return "apple-touch-icon";
  }
  if (tokens.includes("manifest")) return "manifest";
  if (tokens.includes("icon")) return "icon";
  return null;
}

/** The icon and manifest links of a homepage, resolved against `pageUrl` or its `<base href>`. */
export function readHomepageLinks(html: string, pageUrl: URL): HomepageLinks {
  const links: Map<string, string>[] = [];
  let base: URL | null = null;
  for (const match of html.matchAll(MARKUP)) {
    const tag = match.at(2);
    if (tag === undefined) continue;
    const attributes = readAttributes(match[3]);
    if (tag.toLowerCase() === "link") {
      links.push(attributes);
    } else {
      base ??= resolveHttpUrl(attributes.get("href"), pageUrl) ?? pageUrl;
    }
  }

  const icons: IconCandidate[] = [];
  const manifests: URL[] = [];
  for (const attributes of links) {
    const source = sourceOfRel(attributes.get("rel") ?? "");
    const href = attributes.get("href");
    if (source === "manifest") {
      const url = resolveHttpUrl(href, base ?? pageUrl);
      if (url) manifests.push(url);
      continue;
    }
    if (source === null) continue;
    const icon = iconCandidate(
      {
        href,
        sizes: attributes.get("sizes"),
        type: attributes.get("type"),
        source,
        defaultSize:
          source === "apple-touch-icon" ? APPLE_TOUCH_ICON_SIZE : undefined,
      },
      base ?? pageUrl,
    );
    if (icon) icons.push(icon);
  }
  return { icons, manifests };
}
