"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface SettingsRowProps {
  title: ReactNode;
  detail?: ReactNode;
  /** Shown at the end before the caret, such as a Badge. */
  trailing?: ReactNode;
  onClick: () => void;
  /** Indents a child row, such as a child Category. */
  depth?: number;
  /** Buttons after the row, such as "Move up". */
  actions?: ReactNode;
}

/** One row of a Settings list; it opens the row's edit sheet. */
export function SettingsRow({
  title,
  detail,
  trailing,
  onClick,
  depth = 0,
  actions,
}: SettingsRowProps) {
  return (
    <li css={styles.item}>
      <button
        type="button"
        onClick={onClick}
        css={[
          buttonReset.base,
          corner.radius_2,
          transition.colors,
          a11y.focusRing,
          styles.row,
          depth > 0 && styles.child,
        ]}
      >
        <span css={styles.text}>
          <span css={[typeRole.body, styles.title]}>{title}</span>
          {detail ? (
            <span css={[typeRole.caption, styles.detail]}>{detail}</span>
          ) : null}
        </span>
        {trailing}
        {actions ? null : (
          <span aria-hidden css={styles.caret}>
            <CaretRightIcon weight="bold" />
          </span>
        )}
      </button>
      {actions ? <span css={styles.actions}>{actions}</span> : null}
    </li>
  );
}

const styles = stylex.create({
  item: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: rhythm.inline,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    inlineSize: "100%",
    minBlockSize: space._8,
    paddingBlock: space._1,
    paddingInline: space._2,
    textAlign: "start",
    color: color.fg,
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
      ":active": {
        default: color.bgControlPressed,
        [pointer.canHover]: color.bgControlPressed,
      },
    },
  },
  child: {
    paddingInlineStart: space._7,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
  title: {
    fontWeight: font.weight_5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  detail: {
    color: color.fgMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  caret: {
    display: "inline-flex",
    color: color.fgMuted,
  },
});
