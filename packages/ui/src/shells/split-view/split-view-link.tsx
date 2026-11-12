"use client";

import { createContext, use, type ComponentType, type MouseEvent } from "react";
import { PlainAnchor } from "../../actions/tab-bar.tsx";
import type { useOpeningScreen } from "../use-opening-screen.tsx";
import { StatusLink, type TabLinkStatusProps } from "../use-opening-screen.tsx";
import type { SplitViewColumnState, SplitViewLinkProps } from "./types.ts";
import { SplitViewColumnContext } from "./use-split-view-column.ts";

/** @internal */
export interface SplitViewState {
  linkComponent: ComponentType<SplitViewLinkProps>;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  setOpening: ReturnType<typeof useOpeningScreen>["setOpening"];
  /** Follows a column link of `column`, by the history rule of the view. */
  follow: (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    column: SplitViewColumnState["column"],
  ) => void;
}

/** @internal */
export const SplitViewContext = createContext<SplitViewState | null>(null);

/**
 * A link in a column that opens or changes the column after it, such as a
 * row of a list. It renders the view's `linkComponent` and follows the
 * history rule of the view. J and K move focus between the column links of
 * one column. Pass it as the link component of a row, such as `ListRow`'s.
 * With `linkStatus`, it tells the view while the navigation to it is pending,
 * from any column, and the view answers at once. Use it for each link that
 * changes what the view shows. A plain link leaves the view as it is until the
 * router has the new page.
 *
 * @internal
 */
export function SplitViewLink({
  onClick,
  ref,
  skipsKeys = false,
  ...props
}: SplitViewLinkProps & {
  /**
   * Keeps J and K from stopping on this link, for a link that is not an item of
   * its column, such as a breadcrumb in a column with no list.
   *
   * @zh 让 J 与 K 不停留在这个链接上，用于不属于该栏条目的链接，例如没有列表的栏中的面包屑。
   */
  skipsKeys?: boolean;
}) {
  const view = use(SplitViewContext);
  const column = use(SplitViewColumnContext);
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (view !== null && column !== null) {
      view.follow(event, props.href, column.column);
    }
  };
  return (
    <StatusLink
      {...props}
      ref={ref}
      data-split-view-link={skipsKeys ? undefined : ""}
      onClick={follow}
      linkComponent={view?.linkComponent ?? PlainAnchor}
      linkStatus={view?.linkStatus ?? null}
      setOpening={view?.setOpening ?? ignoreOpening}
    />
  );
}

function ignoreOpening() {}
