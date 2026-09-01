import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode, Ref } from "react";
import { transition } from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { space } from "../tokens.stylex.ts";
import { cardSurface } from "./card.stylex.ts";
import { Heading } from "./heading.tsx";
import { Text } from "./text.tsx";

type CardTitleLevel = 2 | 3 | 4 | 5 | 6;

interface CardProps extends Omit<ComponentProps<"div">, "className" | "style"> {
  /**
   * Adds pointer affordances — a hover border and background lift plus an eased
   * colour transition — for a card that is itself clickable. Leave `false` (the
   * default) for a static surface such as a panel or an alert. When the whole
   * card needs to be a link, render your `<Link>`/`<a>` directly and compose
   * `cardSurface` from `@tuja/ui/components/card.stylex` instead — the package
   * intentionally keeps `Card` a `<div>` and framework-agnostic.
   */
  interactive?: boolean;
  /** Card contents. */
  children: ReactNode;
}

/**
 * The system's bordered-surface container: a 1px neutral border, rounded
 * corners, and a raised surface background. Renders a `<div>` and forwards
 * native div attributes (`role`, `id`, `onClick`, `data-*`, `ref`) so a caller
 * can add behaviour or a one-off override without a wrapper. The `css` prop is
 * composed last, letting a caller win over the defaults — including the
 * padding, so a denser or roomier card is a one-liner.
 */
export function Card({
  interactive = false,
  css,
  ref,
  children,
  ...restProps
}: CardProps) {
  return (
    <div
      {...restProps}
      ref={ref}
      css={[
        styles.base,
        cardSurface.base,
        interactive && transition.colors,
        interactive && cardSurface.interactive,
        css,
      ]}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends Omit<
  ComponentProps<"div">,
  "className" | "style"
> {
  /**
   * Control parked at the trailing edge of the header — a menu button, a
   * dismiss, a badge. Top-aligned with the title and never squeezed, so a long
   * title wraps beneath it rather than pushing it out.
   */
  action?: ReactNode;
  /** Header content — typically a `CardTitle` and a `CardDescription`. */
  children: ReactNode;
}

/**
 * The card's title block: a tight stack for the title and its description, with
 * an optional trailing `action`.
 */
export function CardHeader({
  action,
  css,
  ref,
  children,
  ...restProps
}: CardHeaderProps) {
  return (
    <div
      {...restProps}
      ref={ref}
      css={[slotStyles.block, slotStyles.header, css]}
    >
      <div css={slotStyles.headerText}>{children}</div>
      {/* Truthiness, so `action={canEdit && <Button />}` renders no slot at all
          when the condition is false — `!= null` would keep an empty flex item
          and its gap, narrowing the title on every card without an action. */}
      {action ? <div css={slotStyles.headerAction}>{action}</div> : null}
    </div>
  );
}

interface CardTitleProps {
  /**
   * Heading rank. Defaults to `3`; set it to keep the document outline honest
   * when the card sits under a deeper or shallower heading.
   */
  level?: CardTitleLevel;
  /** The card's title. */
  children: ReactNode;
  /**
   * Id applied to the rendered heading — the other half of the named-region
   * pattern, where the `Card` carries `aria-labelledby` pointing here.
   */
  id?: string;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the rendered heading element. */
  ref?: Ref<HTMLHeadingElement>;
}

/**
 * The card's title, rendered as a real heading so a card is reachable by
 * heading navigation. Visual size stays fixed while `level` moves the rank.
 */
export function CardTitle({
  level = 3,
  id,
  css,
  ref,
  children,
}: CardTitleProps) {
  return (
    <Heading level={level} variant="h3" ref={ref} id={id} css={css}>
      {children}
    </Heading>
  );
}

interface CardDescriptionProps {
  /** The supporting copy. */
  children: ReactNode;
  /**
   * Id applied to the rendered paragraph, e.g. for an `aria-describedby` on the
   * control the card is about.
   */
  id?: string;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the rendered paragraph. */
  ref?: Ref<HTMLElement>;
}

/** Supporting copy beneath a `CardTitle`. */
export function CardDescription({
  id,
  css,
  ref,
  children,
}: CardDescriptionProps) {
  return (
    <Text variant="bodySmall" tone="muted" ref={ref} id={id} css={css}>
      {children}
    </Text>
  );
}

/** The card's main content region. */
export function CardContent({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"div">, "className" | "style">) {
  return (
    <div {...restProps} ref={ref} css={[slotStyles.block, css]}>
      {children}
    </div>
  );
}

/** A trailing row for the card's actions. */
export function CardFooter({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"div">, "className" | "style">) {
  return (
    <div
      {...restProps}
      ref={ref}
      css={[slotStyles.block, slotStyles.footer, css]}
    >
      {children}
    </div>
  );
}

const styles = stylex.create({
  base: {
    boxSizing: "border-box",
    paddingBlock: space._3,
    paddingInline: space._4,
  },
});

const slotStyles = stylex.create({
  // Each block spaces itself off the one before it rather than relying on a gap
  // from the parent, so the slots keep their rhythm inside a bare element
  // composing `cardSurface` — not only inside `Card`, which is a plain block.
  //
  // Block-axis only, so it is a vertical stack the slots assume. A caller who
  // wants them laid out in a row should set a `gap` on the parent; the margin
  // contributes nothing along the inline axis and would leave the slots flush.
  block: {
    marginBlockStart: { default: null, ":not(:first-child)": space._3 },
  },
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
  footer: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
});
