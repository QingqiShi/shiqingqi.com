import { isRendered } from "../../focus/is-rendered.ts";

/**
 * The data attributes that tell the motion which element is which.
 *
 * @internal
 */
export const SELECTOR = {
  content: ':scope > * > [data-split-view-column="content"]',
  detail: ':scope > * > [data-split-view-column="detail"]',
  fullSidebar: ':scope > * > [data-split-view-sidebar="full"]',
  stackRoot:
    ":scope > * > [data-split-view-sidebar] > [data-split-view-pages] > [data-split-view-stack]",
  collapsedSidebar: ':scope > * > [data-split-view-sidebar="collapsed"]',
  page: (role: "under" | "current" | "leaving") =>
    `:scope > [data-split-view-pages] > [data-split-view-page="${role}"]`,
} as const;

/**
 * The width of a view, in rem, below which the content fills it, as on a phone.
 *
 * @internal
 */
export const STACKED_BELOW_REM = 30;
/**
 * The width of a view, in rem, below which the full sidebar does not fit beside
 * the content. A sidebar that is a page of the stack has no other form, so the
 * view stacks up to here. It is the same width as
 * `splitViewQueries.contentBesideSidebar`.
 *
 * @internal
 */
export const STACK_PAGE_BELOW_REM = 48;

/**
 * `px` in rem. It reads the style of the root.
 *
 * @internal
 */
export function pxToRem(px: number) {
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return px / (rem || 16);
}

/**
 * Whether the content fills the view, as on a phone. It reads the layout.
 *
 * @internal
 */
export function isViewStacked(view: HTMLElement) {
  const stackedBelow =
    view.querySelector(SELECTOR.stackRoot) === null
      ? STACKED_BELOW_REM
      : STACK_PAGE_BELOW_REM;
  return pxToRem(view.getBoundingClientRect().width) < stackedBelow;
}

/** @internal */
export function isShown(element: Element) {
  if (!element.isConnected) return false;
  if (element.closest("[data-split-view-leaving]") !== null) return false;
  const visible =
    typeof element.checkVisibility === "function"
      ? element.checkVisibility({ visibilityProperty: true })
      : isRendered(element, { visibilityProperty: true });
  if (!visible) return false;
  const { width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0;
}
