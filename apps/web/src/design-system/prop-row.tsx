"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { headerControlsTokens } from "@tuja/ui/components/header-controls.stylex";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableDisclosure } from "@tuja/ui/components/table-disclosure";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { duration, easing } from "@tuja/ui/primitives/motion.stylex";
import { controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PropRowProps {
  /** The fragment of the row, which a link can point at. */
  id: string;
  /** The name cell: the trigger and the marks. */
  name: ReactNode;
  /** The type, on one line. */
  type: ReactNode;
  /** The first sentence of the description, on one line. */
  summary: ReactNode;
  /** The type in full, which the panel shows while the cell cuts it. */
  fullType: ReactNode;
  /** The whole description. */
  children: ReactNode;
}

/**
 * One prop: a row of one line that opens its whole description under it. A
 * link to the row, or a fragment that names it when the page loads, opens it.
 */
export function PropRow({
  id,
  name,
  type,
  summary,
  fullType,
  children,
}: PropRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTypeCut, setIsTypeCut] = useState(false);
  const typeRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const arrive = () => {
      if (decodeURIComponent(window.location.hash.slice(1)) === id) {
        setIsOpen(true);
      }
    };
    arrive();
    window.addEventListener("hashchange", arrive);
    return () => {
      window.removeEventListener("hashchange", arrive);
    };
  }, [id]);

  useEffect(() => {
    const cell = typeRef.current;
    if (cell === null) return;
    const observer = new ResizeObserver(() => {
      setIsTypeCut(cell.scrollWidth > cell.clientWidth);
    });
    observer.observe(cell);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <TableDisclosure
      id={id}
      open={isOpen}
      onOpenChange={setIsOpen}
      css={[stylex.defaultMarker(), styles.row]}
      panelCss={styles.panel}
      summary={
        <>
          <TableHeaderCell
            scope="row"
            css={[styles.cell, styles.nameCell, styles.arriveUnder]}
          >
            {name}
          </TableHeaderCell>
          <TableCell
            ref={typeRef}
            css={[styles.cell, styles.cutCell, styles.typeCell]}
          >
            {type}
          </TableCell>
          <TableCell css={[styles.cell, styles.cutCell, styles.summaryCell]}>
            {summary}
          </TableCell>
        </>
      }
    >
      {isTypeCut ? fullType : null}
      {children}
    </TableDisclosure>
  );
}

/** One line of text in each cell, on the line of the row's centre. */
const LINE = "1.25rem";

/**
 * The quiet sign on the row a link lands on: a wash that fades out. It
 * changes only colour, so it stays under reduced motion.
 */
const arrive = stylex.keyframes({
  from: { backgroundColor: color.bgAccentSubtle },
});

/**
 * The name cell is opaque, so it is clear while the wash of the row under it
 * fades. The wash ends on the fill the cell comes back to.
 */
const arriveUnder = stylex.keyframes({
  from: { backgroundColor: "transparent" },
  to: { backgroundColor: "transparent" },
});

const styles = stylex.create({
  row: {
    animationName: { default: null, ":target": arrive },
    animationDuration: duration._2000,
    animationTimingFunction: easing.easeIn,
    scrollMarginBlockStart: `calc(${headerControlsTokens.clearance} + ${rhythm.group})`,
  },
  arriveUnder: {
    animationName: {
      default: null,
      [stylex.when.ancestor(":target")]: arriveUnder,
    },
    animationDuration: duration._2000,
    animationTimingFunction: easing.easeIn,
  },
  // Every row is one line high, the height of a large control.
  cell: {
    paddingBlock: {
      default: `calc((${controlHeight.md} - ${LINE}) / 2)`,
      [breakpoints.md]: `calc((${controlHeight.lg} - ${LINE}) / 2)`,
    },
    lineHeight: LINE,
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  },
  nameCell: {
    inlineSize: "1px",
  },
  // `max-inline-size: 0` lets the column take its share of the table, not the
  // width of its text, so the text ends in an ellipsis.
  cutCell: {
    maxInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // The containing block of the screen-reader hint, so it moves with the row.
  typeCell: {
    position: "relative",
    inlineSize: "40%",
  },
  summaryCell: {
    color: color.fgMuted,
  },
  // The end clears the blur at the end edge of a table that scrolls.
  panel: {
    paddingInlineStart: space._3,
    paddingInlineEnd: space._5,
    paddingBlockStart: space._0,
    paddingBlockEnd: space._3,
  },
});
