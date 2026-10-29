const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const TOP_LEVEL_LABEL = "[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?";
const DOMAIN = new RegExp(`^(?:${LABEL}\\.)+${TOP_LEVEL_LABEL}$`);
const MAX_DOMAIN_LENGTH = 253;

/** True for a lower-case host name with at least two labels and a top-level label that starts with a letter, so never an IP address. */
export function isInstitutionDomain(value: string) {
  return value.length <= MAX_DOMAIN_LENGTH && DOMAIN.test(value);
}

/**
 * The domain in what a person or a model wrote: a bare domain or a URL,
 * lower-cased, without `www.`. Null when it holds no usable domain.
 */
export function parseInstitutionDomain(text: string): string | null {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === "") return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let host: string;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username !== "" || url.password !== "" || url.port !== "") {
      return null;
    }
    host = url.hostname;
  } catch {
    return null;
  }
  const domain = host.replace(/\.$/, "").replace(/^www\./, "");
  return isInstitutionDomain(domain) ? domain : null;
}
