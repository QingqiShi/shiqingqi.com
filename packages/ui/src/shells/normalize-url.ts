/**
 * The URL without its fragment and with its params in order, to compare two
 * URLs.
 *
 * @internal
 */
export function normalizeUrl(href: string) {
  const url = new URL(href, window.location.href);
  url.hash = "";
  url.searchParams.sort();
  return url.href;
}
