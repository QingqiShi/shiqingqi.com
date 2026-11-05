"use client";

import { createContext, use, type ComponentType, type MouseEvent } from "react";
import { PlainAnchor } from "../../actions/tab-bar.tsx";
import { useDust } from "../../effect-layer/use-dust.ts";
import { useExtractorFan } from "../../effect-layer/use-extractor-fan.ts";
import { mergeRefs } from "../../merge-refs.ts";
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
 * What the Column links of a sidebar form do with dust while the sidebar
 * folds: the form that goes sheds it, and the form that comes pulls it in.
 *
 * @internal
 */
export const SplitViewDustContext = createContext<"shed" | "pull" | null>(null);

/** How much dust a Column link of the sidebar form that goes sheds. */
const FOLD_DUST_DENSITY = 60;
/** How far a Column link of the sidebar form that comes pulls dust in, in px. */
const FOLD_FAN_REACH = 360;

/**
 * A link in a column that opens or changes the column after it, such as a
 * row of a list. It renders the view's `linkComponent` and follows the
 * history rule of the view. J and K move focus between the column links of
 * one column. Pass it as the link component of a row, such as `ListRow`'s.
 * With `linkStatus`, it tells the view while the navigation to it is pending,
 * from any column, and the view answers at once. Use it for each link that
 * changes what the view shows. A plain link leaves the view as it is until the
 * router has the new page. While the sidebar folds, the links of the form that goes dissolve into
 * dust that the links of the form that comes pull in, on the effect layer.
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
  const dust = use(SplitViewDustContext);
  const dustRef = useDust({ density: dust === "shed" ? FOLD_DUST_DENSITY : 0 });
  const fanRef = useExtractorFan({
    reach: dust === "pull" ? FOLD_FAN_REACH : 0,
  });
  const linkRef = mergeRefs(ref, dustRef, fanRef);
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (view !== null && column !== null) {
      view.follow(event, props.href, column.column);
    }
  };
  return (
    <StatusLink
      {...props}
      ref={linkRef}
      data-split-view-link={skipsKeys ? undefined : ""}
      onClick={follow}
      linkComponent={view?.linkComponent ?? PlainAnchor}
      linkStatus={view?.linkStatus ?? null}
      setOpening={view?.setOpening ?? ignoreOpening}
    />
  );
}

function ignoreOpening() {}
