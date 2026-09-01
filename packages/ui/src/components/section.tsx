import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../style-prop.ts";
import { border, color, font, space } from "../tokens.stylex.ts";

type SectionLevel = 2 | 3 | 4 | 5 | 6;

/**
 * The label's own styles, rendered onto the heading element directly rather
 * than by composing `Heading` with an override. Two components each running
 * their own `stylex.props` would emit two atomic classes for `font-size` and
 * `color`, and which one wins is then a question of stylesheet order rather
 * than of composition order. Owning the declarations keeps them in one call,
 * where last-wins is defined.
 */
function SectionHeading({
  level,
  children,
}: {
  level: SectionLevel;
  children: ReactNode;
}) {
  switch (level) {
    case 2:
      return <h2 css={styles.title}>{children}</h2>;
    case 3:
      return <h3 css={styles.title}>{children}</h3>;
    case 4:
      return <h4 css={styles.title}>{children}</h4>;
    case 5:
      return <h5 css={styles.title}>{children}</h5>;
    case 6:
      return <h6 css={styles.title}>{children}</h6>;
  }
}

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
 * optional trailing controls — above whatever the section holds.
 *
 * The label is deliberately understated: at this scale a section title is
 * wayfinding, not hierarchy, so it reads as muted small text while still being
 * a real `<h2>`–`<h6>` for anyone navigating by headings. Reach for `Heading`
 * directly when a section genuinely needs a prominent title.
 *
 * Renders a `<section>` and forwards native attributes (`id`, `aria-*`,
 * `data-*`, `ref`); `css` is composed last.
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
        {/* Truthiness throughout, so `icon={isPinned && <PinIcon />}` and
            `actions={canEdit && <Button />}` collapse their slot entirely when
            the condition is false. `!= null` would call `false` present and
            leave an empty box holding the header's gap open. */}
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
  title: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_3,
    color: color.textMuted,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    marginInlineStart: "auto",
  },
});
