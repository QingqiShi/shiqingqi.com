import { useLayoutEffect, useState } from "react";

/** How many accounts "What moved this week" shows where it has no room to spare. */
const SHORT_MOVER_LIST = 5;

/** How much taller than its content a row of movers can grow. */
const MOST_ROW_GROWTH = 1.5;

interface MoverRows {
  /** How many movers show, at most. */
  shown: number;
  /**
   * The least block size of the column of cards, in pixels, or null where
   * the column takes the height of its content.
   */
  floor: number | null;
  /** The block size of each row of movers, in pixels, or null where each row takes the height of its content. */
  rowHeight: number | null;
}

const SHORT: MoverRows = {
  shown: SHORT_MOVER_LIST,
  floor: null,
  rowHeight: null,
};

function sameRows(a: MoverRows, b: MoverRows) {
  return (
    a.shown === b.shown && a.floor === b.floor && a.rowHeight === b.rowHeight
  );
}

/** The block size of a row of movers without its growth: its name and the padding of its link. */
function contentHeight(row: Element) {
  const link = row.firstElementChild;
  const name = link?.firstElementChild;
  if (link == null || name == null) return 0;
  const { paddingTop, paddingBottom } = getComputedStyle(link);
  return (
    name.getBoundingClientRect().height +
    parseFloat(paddingTop) +
    parseFloat(paddingBottom)
  );
}

/**
 * How "What moved this week" lays out `moverCount` movers in the column of
 * cards that `setColumn` takes, where `setCard` takes its card, the last in
 * the column. Only where the column has size containment, as beside the
 * trend, does the list take more than the short list, because there its
 * content does not set its height. The card may stretch to the end of the
 * column, so its content ends at its last child.
 */
export function useMoverRows(moverCount: number) {
  const [column, setColumn] = useState<HTMLElement | null>(null);
  const [card, setCard] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState(SHORT);

  useLayoutEffect(() => {
    if (column == null || card == null) return;
    const commit = (next: MoverRows) => {
      setRows((current) => (sameRows(current, next) ? current : next));
    };
    const measure = () => {
      if (!getComputedStyle(column).contain.includes("size")) {
        commit(SHORT);
        return;
      }
      const items = card.querySelectorAll("li");
      const { paddingBottom, borderBottomWidth } = getComputedStyle(card);
      const content =
        (card.lastElementChild ?? card).getBoundingClientRect().bottom +
        parseFloat(paddingBottom) +
        parseFloat(borderBottomWidth) -
        column.getBoundingClientRect().top;
      if (items.length === 0) {
        commit({ ...SHORT, floor: Math.ceil(content) });
        return;
      }
      const first = items[0];
      const natural = contentHeight(first);
      const chrome =
        content - items.length * first.getBoundingClientRect().height;
      const floor = Math.ceil(
        chrome + Math.min(items.length, SHORT_MOVER_LIST) * natural,
      );
      const room = column.clientHeight - chrome;
      const shown = Math.max(SHORT_MOVER_LIST, Math.floor(room / natural));
      const rowHeight = Math.max(
        natural,
        Math.min(
          natural * MOST_ROW_GROWTH,
          Math.floor(room / Math.min(items.length, shown)),
        ),
      );
      commit({ shown, floor, rowHeight });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    for (const child of column.children) observer.observe(child);
    observer.observe(card);
    return () => {
      observer.disconnect();
    };
  }, [column, card, moverCount]);

  return { ...rows, setColumn, setCard };
}
