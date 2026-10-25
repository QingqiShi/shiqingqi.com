/**
 * One page of a column: what the column showed for one key. `motion` is
 * the motion that made it leave, or 0.
 *
 * @internal
 */
export interface SplitViewPage<Column> {
  readonly key: string;
  readonly column: Column;
  /** Whether the page has a way back to a page under it. */
  readonly deep: boolean;
  readonly motion: number;
}

/**
 * The pages a column holds: the page it shows, the page under it that a
 * swipe back or a pop shows again, and a page that leaves while a motion
 * runs.
 *
 * @internal
 */
export interface SplitViewPages<Column> {
  readonly under: SplitViewPage<Column> | null;
  readonly current: SplitViewPage<Column>;
  readonly leaving: SplitViewPage<Column> | null;
}

/**
 * The pages after the column shows `next`, and how the column got there:
 * one page deeper (`"push"`), back one page (`"pop"`), or to another page
 * at the same depth (`"swap"`). A push keeps the page it leaves under the
 * new one. A pop shows the page under again, where it is the one that
 * `next` names. The page that goes leaves with `motion`.
 *
 * @internal
 */
export function followPage<Column>(
  pages: SplitViewPages<Column>,
  next: SplitViewPage<Column>,
): { pages: SplitViewPages<Column>; change: "push" | "pop" | "swap" | null } {
  const { under, current, leaving } = pages;
  if (next.key === current.key) {
    return { pages: { under, current: next, leaving }, change: null };
  }
  const left = { ...current, motion: next.motion };
  const stillLeaving = leaving?.key === next.key ? null : leaving;
  if (next.deep && !current.deep) {
    return {
      pages: { under: current, current: next, leaving: stillLeaving },
      change: "push",
    };
  }
  if (!next.deep && current.deep) {
    return {
      pages: {
        under: null,
        current: next,
        leaving: left,
      },
      change: "pop",
    };
  }
  return {
    pages: {
      under: under?.key === next.key ? null : under,
      current: next,
      leaving: left,
    },
    change: "swap",
  };
}

/**
 * The pages once every motion up to `motion` has ended: a page that left in
 * one of them goes.
 *
 * @internal
 */
export function settlePages<Column>(
  pages: SplitViewPages<Column>,
  motion: number,
): SplitViewPages<Column> {
  if (pages.leaving === null || pages.leaving.motion > motion) return pages;
  return { ...pages, leaving: null };
}
