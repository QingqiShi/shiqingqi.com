import type { LinkSlotProps } from "./link-provider.tsx";

/**
 * Whether the browser must follow the link itself: it leaves the app, it goes
 * to a route handler, it stays on the page at a fragment, it opens elsewhere,
 * or it downloads a file. The router fetches a page before it navigates, and a
 * route handler such as an OAuth entry must not run from that fetch.
 */
export function isBrowserLink({
  href,
  target,
  download,
}: Pick<LinkSlotProps, "href" | "target" | "download">) {
  return (
    /^([a-z][a-z\d+.-]*:|\/\/|#|\/api(\/|\?|$))/i.test(href) ||
    (target !== undefined && target !== "_self") ||
    download !== undefined
  );
}
