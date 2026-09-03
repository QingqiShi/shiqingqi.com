import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../../style-prop.ts";
import { border, color, font, space } from "../../tokens.stylex.ts";
import { SectionHeading } from "./section-heading.tsx";

export type SectionLevel = 2 | 3 | 4 | 5 | 6;

interface SectionProps extends Omit<
  ComponentProps<"section">,
  "title" | "children" | "className" | "style"
> {
  /** The block's label. Rendered as a real heading, so keep it to a phrase. */
  title: ReactNode;
  /** Section body. */
  children: ReactNode;
  /** Decorative icon before the label, rendered `aria-hidden`. */
  icon?: ReactNode;
  /**
   * Controls parked at the end of the heading row — a "see all" link, a filter.
   * Unlike `icon` these are real content, so they stay in the accessibility
   * tree and may be interactive.
   */
  actions?: ReactNode;
  /**
   * Heading rank for the label. Defaults to `3`; set it to keep the document
   * outline honest when the section nests deeper or shallower than usual.
   */
  level?: SectionLevel;
  /**
   * Rules the section off from what precedes it. Use it when sections follow
   * one another directly and the label alone isn't enough of a break.
   */
  divider?: boolean;
  /** StyleX overrides merged over the root — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * A labelled block of content: a quiet heading row — optional icon, the label,
 * optional trailing controls — above whatever it holds.
 * The label reads as muted small text on purpose (wayfinding, not hierarchy)
 * while staying a real heading; reach for `Heading` directly for a prominent
 * title.
 */
export function Section({
  title,
  children,
  icon,
  actions,
  level = 3,
  divider,
  css,
  ref,
  ...restProps
}: SectionProps) {
  return (
    <section
      {...restProps}
      ref={ref}
      css={[styles.root, divider === true && styles.divided, css]}
    >
      <div css={styles.header}>
        {/* Truthiness: `icon={cond && <X/>}` / `actions={cond && <Y/>}` then
            render no slot. `!= null` would keep an empty box and the gap. */}
        {icon ? (
          <span css={styles.icon} aria-hidden>
            {icon}
          </span>
        ) : null}
        <SectionHeading level={level}>{title}</SectionHeading>
        {actions ? <div css={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  divided: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
    paddingBlockStart: space._5,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
  // `em` box against an explicit font-size, so the icon tracks the label
  // rather than whatever the section's contents happen to set.
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: font.uiBodySmall,
    inlineSize: "1em",
    blockSize: "1em",
    color: color.textMuted,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    marginInlineStart: "auto",
  },
});
