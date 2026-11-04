"use client";

import { Component, type RefObject } from "react";

const CURRENT_PAGE_NODE =
  ':scope > * > [data-split-view-column="content"] > [data-split-view-pages] > [data-split-view-page="current"] [data-split-view-node]';

/**
 * The DOM of a page that leaves, keyed by the page.
 *
 * @internal
 */
export interface LeavingCopy {
  key: string;
  nodes: DocumentFragment;
  /** The scroll of the page's column. */
  top: number;
}

/**
 * The children of `node`, as a copy that nothing can reach by id or by name. It
 * goes inside a page that is `inert` and hidden from assistive technology.
 */
function copyOf(node: Element) {
  const copy = node.cloneNode(true);
  const nodes = document.createDocumentFragment();
  nodes.append(...copy.childNodes);
  for (const element of nodes.querySelectorAll(
    "[id], [name], [for], [data-split-view-link]",
  )) {
    element.removeAttribute("id");
    element.removeAttribute("name");
    element.removeAttribute("for");
    element.removeAttribute("data-split-view-link");
  }
  return nodes;
}

interface LeavingCopyTakerProps {
  view: HTMLElement | null;
  pageKey: string;
  /** The page whose copy shows as it leaves. Another page needs no copy. */
  copyKey: string | null;
  copyRef: RefObject<LeavingCopy | null>;
}

/**
 * The router gives one element for the content of every URL, which renders the
 * segment of the current URL, so a page that leaves cannot show its old content
 * from React. This takes a copy of its DOM in the commit that removes it. Only
 * `getSnapshotBeforeUpdate` runs before React changes the DOM, and no hook does
 * it, so this is a class.
 *
 * @internal
 */
export class LeavingCopyTaker extends Component<LeavingCopyTakerProps> {
  override getSnapshotBeforeUpdate(previous: LeavingCopyTakerProps) {
    const { view, pageKey, copyKey, copyRef } = this.props;
    if (previous.pageKey !== pageKey) {
      const shown =
        copyKey === previous.pageKey
          ? view?.querySelector(CURRENT_PAGE_NODE)
          : null;
      copyRef.current =
        shown == null
          ? null
          : {
              key: previous.pageKey,
              nodes: copyOf(shown),
              top:
                shown.closest("[data-split-view-page]")?.firstElementChild
                  ?.scrollTop ?? 0,
            };
    }
    return null;
  }
  // React warns about a snapshot without this method.
  override componentDidUpdate() {}
  override render() {
    return null;
  }
}
