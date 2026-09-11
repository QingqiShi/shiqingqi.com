// An XML namespace is a name, not an address, so it is the one URL the output
// may carry.
const ALLOWED_URL = "http://www.w3.org/";

// Every place a browser reads a URL from and goes to fetch it.
const REQUEST_POSITIONS = [
  /url\(\s*['"]?(?:https?:)?\/\//gi,
  /@import\s+['"]?(?:https?:)?\/\//gi,
  /\b(?:src|href|srcset|poster|action|formaction|data)\s*=\s*['"]?(?:https?:)?\/\//gi,
];

/**
 * Throws when the page would fetch anything, and returns the URLs it carries
 * as text, which nothing fetches.
 */
export function assertNoExternalRequests(html) {
  const fetched = REQUEST_POSITIONS.flatMap((pattern) => [
    ...html.matchAll(pattern),
  ]).map((match) => match[0]);
  if (fetched.length > 0) {
    throw new Error(
      `The output would fetch from outside itself:\n  ${[...new Set(fetched)].join("\n  ")}`,
    );
  }
  return [...html.matchAll(/https?:\/\/[^\s"'()]+/g)]
    .map((match) => match[0])
    .filter((url) => !url.startsWith(ALLOWED_URL));
}
