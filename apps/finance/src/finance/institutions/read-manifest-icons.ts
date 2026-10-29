import { iconCandidate, type IconCandidate } from "./icon-candidate.ts";

const BYTE_ORDER_MARK = 0xfeff;

function stringField(value: object, key: string) {
  const field: unknown = Reflect.get(value, key);
  return typeof field === "string" ? field : undefined;
}

function isUsablePurpose(purpose: string | undefined) {
  if (purpose === undefined) return true;
  const tokens = purpose.toLowerCase().split(/\s+/);
  return tokens.includes("any") || tokens.includes("maskable");
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(
      json.charCodeAt(0) === BYTE_ORDER_MARK ? json.slice(1) : json,
    );
  } catch {
    return null;
  }
}

/** The raster icons of a web app manifest, resolved against `manifestUrl`. */
export function readManifestIcons(
  json: string,
  manifestUrl: URL,
): IconCandidate[] {
  const manifest = parseJson(json);
  if (typeof manifest !== "object" || manifest === null) return [];
  const icons: unknown = Reflect.get(manifest, "icons");
  if (!Array.isArray(icons)) return [];

  const candidates: IconCandidate[] = [];
  for (const icon of icons) {
    const entry: unknown = icon;
    if (typeof entry !== "object" || entry === null) continue;
    if (!isUsablePurpose(stringField(entry, "purpose"))) continue;
    const candidate = iconCandidate(
      {
        href: stringField(entry, "src"),
        sizes: stringField(entry, "sizes"),
        type: stringField(entry, "type"),
        source: "manifest",
      },
      manifestUrl,
    );
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}
