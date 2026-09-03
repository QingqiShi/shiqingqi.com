import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { space } from "../tokens.stylex.ts";
import { slotStyles } from "./card-slot.stylex.ts";

interface CardHeaderProps extends Omit<
  ComponentProps<"div">,
  "className" | "style"
> {
  /**
   * Control at the header's trailing edge — a menu button, dismiss, or badge.
   * Stays top-aligned and never squeezes; a long title wraps beneath it instead.
   */
  action?: ReactNode;
  /** Header content — typically a `CardTitle` and a `CardDescription`. */
  children: ReactNode;
}

/**
 * The card's title block: a tight stack for the title and its description,
 * with an optional trailing `action`.
 */
export function CardHeader({
  action,
  css,
  ref,
  children,
  ...restProps
}: CardHeaderProps) {
  return (
    <div {...restProps} ref={ref} css={[slotStyles.block, styles.header, css]}>
      <div css={styles.headerText}>{children}</div>
      {/* Truthiness: `action={cond && <Button/>}` then renders no slot.
          `!= null` would keep an empty flex item and its gap. */}
      {action ? <div css={styles.headerAction}>{action}</div> : null}
    </div>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: space._2,
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    flexGrow: 1,
    // Let a long title wrap instead of forcing the header row wider.
    minInlineSize: 0,
  },
  headerAction: {
    flexShrink: 0,
  },
});
