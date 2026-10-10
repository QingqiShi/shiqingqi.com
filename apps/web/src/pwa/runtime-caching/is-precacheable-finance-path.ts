const FINANCE_PAGE = /^(?:\/zh)?\/finance(?:\/[a-z0-9-]+)*$/;
const OPEN_PAGE = /^(?:\/zh)?\/finance\/(?:sign-in|invite)(?:\/|$)/;

/** Whether `path` is a gated Finance page the service worker may store, such as `/zh/finance/analytics`. */
export function isPrecacheableFinancePath(path: string): boolean {
  return FINANCE_PAGE.test(path) && !OPEN_PAGE.test(path);
}
