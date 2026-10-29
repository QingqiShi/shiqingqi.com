const FINANCE_PAGE = /^\/$|^(?:\/[a-z0-9-]+)+$/;
const OPEN_PAGE = /^(?:\/zh)?\/(?:sign-in|invite)(?:\/|$)/;

/** Whether `path` is a gated Finance page the service worker may store, such as `/zh/analytics`. */
export function isPrecacheableFinancePath(path: string): boolean {
  return FINANCE_PAGE.test(path) && !OPEN_PAGE.test(path);
}
