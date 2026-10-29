import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { transactionFaceTokens } from "./transaction-face.stylex.ts";

/** One line of text in a skeleton, as a block of its size. */
export interface SkeletonLine {
  width: string;
  height: string;
}

interface TransactionFaceSkeletonProps {
  /** The lines under the icon's side, from the title down. */
  lines: readonly SkeletonLine[];
  /** The lines at the end, from the amount down. */
  trailing: readonly SkeletonLine[];
  /** The row's block size, and its space to the next row. */
  css?: StyleProp;
}

/** A `TransactionFace` before it shows: the icon and each line, as blocks. */
export function TransactionFaceSkeleton({
  lines,
  trailing,
  css,
}: TransactionFaceSkeletonProps) {
  return (
    <div css={[plainList.row, styles.face, css]}>
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

const styles = stylex.create({
  face: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.item,
    paddingBlock: transactionFaceTokens.paddingBlock,
  },
  icon: {
    width: transactionFaceTokens.icon,
    height: transactionFaceTokens.icon,
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
