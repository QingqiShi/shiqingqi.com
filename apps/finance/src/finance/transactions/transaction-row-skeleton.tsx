import * as stylex from "@stylexjs/stylex";
import { listRowSizes, listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { font, rhythm } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";

/** One line of text in a skeleton, as a block of its size. */
export interface SkeletonLine {
  width: string;
  height: string;
}

interface TransactionRowSkeletonProps {
  /** The lines beside the icon, from the title down. */
  lines: readonly SkeletonLine[];
  /** The lines at the end, from the amount down. */
  trailing: readonly SkeletonLine[];
  /** The row's block size, and its space to the next row. */
  css?: StyleProp;
}

/**
 * A Transaction's `ListRow` before it shows: the icon and each line, as
 * blocks. Put it in a list with `listSurface.plain`, as the rows are.
 */
export function TransactionRowSkeleton({
  lines,
  trailing,
  css,
}: TransactionRowSkeletonProps) {
  return (
    <div css={[listSurface.row, listSurface.withMedia, styles.row, css]}>
      <Skeleton css={[corner.radius_round, styles.icon]} />
      <div css={[styles.lines, styles.grow]}>
        {lines.map((line, index) => (
          <Skeleton key={index} width={line.width} height={line.height} />
        ))}
      </div>
      <div css={[styles.lines, styles.end]}>
        {trailing.map((line, index) => (
          <Skeleton key={index} width={line.width} height={line.height} />
        ))}
      </div>
    </div>
  );
}

const headLines = `calc((${font.uiBody} + ${font.uiBodySmall}) * ${font.lineHeightBody})`;

const styles = stylex.create({
  row: {
    alignItems: "flex-start",
    gap: rhythm.item,
  },
  // A ListRow centres its icon on the title and the first detail line.
  icon: {
    flexShrink: 0,
    inlineSize: listRowSizes.media_md,
    blockSize: listRowSizes.media_md,
    marginBlockStart: `calc((${headLines} - ${listRowSizes.media_md}) / 2)`,
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  grow: {
    flexGrow: 1,
  },
  end: {
    alignItems: "flex-end",
  },
});
