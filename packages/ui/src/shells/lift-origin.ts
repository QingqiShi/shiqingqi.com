import { isRendered } from "../focus/is-rendered.ts";
import { normalizeUrl } from "./normalize-url.ts";

/**
 * The link that a sheet lifts out of and goes back into: the column link
 * that was pressed, or else a link in the content that opens `href`, the
 * URL of the sheet. That link can be a column link or a plain link, such as
 * the row of a list that changes the URL itself. Only a link that shows on
 * the screen counts, so the sheet slides where its row scrolled away, went,
 * or is under another page.
 *
 * @internal
 */
export function liftOrigin(
  view: HTMLElement,
  pressed: HTMLElement | null,
  href: string | null,
) {
  if (href === null) return null;
  const here = normalizeUrl(href);
  const opensHere = (link: HTMLElement) =>
    link instanceof HTMLAnchorElement && normalizeUrl(link.href) === here;
  if (pressed !== null && opensHere(pressed) && isOnScreen(pressed)) {
    return pressed;
  }
  const links = view.querySelectorAll<HTMLAnchorElement>(
    '[data-split-view-column="content"] a[href]',
  );
  for (const link of links) {
    if (opensHere(link) && isOnScreen(link)) return link;
  }
  return null;
}

function isOnScreen(element: HTMLElement) {
  if (!element.isConnected) return false;
  const page = element.closest("[data-split-view-page]");
  if (
    page !== null &&
    page.getAttribute("data-split-view-page") !== "current"
  ) {
    return false;
  }
  if (!isRendered(element, { visibilityProperty: true })) return false;
  const { top, right, bottom, left, width, height } =
    element.getBoundingClientRect();
  return (
    width > 0 &&
    height > 0 &&
    bottom > 0 &&
    right > 0 &&
    top < window.innerHeight &&
    left < window.innerWidth
  );
}
