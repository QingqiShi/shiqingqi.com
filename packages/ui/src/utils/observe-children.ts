interface ObserveChildrenOptions {
  /**
   * Watch the container's own box too, for a measurement that reads it as well
   * as its children.
   */
  includeContainer?: boolean;
}

/**
 * Watches a container's children for anything a measurement of them would
 * notice, and returns the teardown: every resize of a child, and every change
 * to the child list, because one element swapped for another — or dropped —
 * reports no resize. The observed set follows the list.
 *
 * Both observers are absent in some environments (jsdom), hence the guards:
 * there nothing is ever measured.
 *
 * @internal
 */
export function observeChildren(
  container: Element,
  onChange: () => void,
  options?: ObserveChildrenOptions,
) {
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(onChange);
  if (options?.includeContainer === true) resizeObserver?.observe(container);
  for (const child of container.children) resizeObserver?.observe(child);

  const mutationObserver =
    typeof MutationObserver === "undefined"
      ? undefined
      : new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) resizeObserver?.observe(node);
            }
            for (const node of mutation.removedNodes) {
              if (node instanceof Element) resizeObserver?.unobserve(node);
            }
          }
          onChange();
        });
  mutationObserver?.observe(container, { childList: true });

  return () => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
  };
}
