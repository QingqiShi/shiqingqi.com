const DETAIL_PAGE =
  /^((?:\/zh)?\/finance)\/(accounts|reports|settings)\/([^/]+)$/;

/**
 * Where to send an offline navigation to a Finance page that is not stored:
 * an account opens as the net worth pane, a Report and a Settings section as
 * their list. Null when the page has no stored stand-in.
 */
export function offlineRedirectFor(url: URL): string | null {
  const match = DETAIL_PAGE.exec(url.pathname);
  if (!match) return null;
  const [, base, section, id] = match;
  if (section === "accounts") {
    return `${base}?account=${encodeURIComponent(decodeURIComponent(id))}`;
  }
  return `${base}/${section}`;
}
