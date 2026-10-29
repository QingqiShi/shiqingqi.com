/** Set on a Finance page that needs a session; the service worker stores only those. */
export const FINANCE_SHELL_HEADER = "x-finance-shell";

/** The proxy puts the requested Finance page (locale-free, with its query) on the request, so a layout can send a stale session to sign-in with the right `next`. */
export const FINANCE_PATH_HEADER = "x-finance-path";
