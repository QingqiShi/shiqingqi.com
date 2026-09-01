import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { transition } from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { color } from "../tokens.stylex.ts";
import { chipSize, chipSurface } from "./chip.stylex.ts";

type ChipSize = "sm" | "md";

interface ChipBaseProps {
  /** Chip contents — usually a short label. */
  children: ReactNode;
  /** Decorative leading icon, rendered `aria-hidden`. */
  icon?: ReactNode;
  /**
   * Trailing content — a count, a note, a caret. Unlike `icon` it stays in the
   * accessibility tree, so it reads as part of the chip's name.
   */
  trailing?: ReactNode;
  /** Height and type scale. Defaults to `"md"`. */
  size?: ChipSize;
  /**
   * Paints the chip as the selected one. On the button form this also emits
   * `aria-pressed`; the anchor form is visual only, since a link is not a
   * toggle — mark the current one with `aria-current` yourself.
   */
  isActive?: boolean;
  /** StyleX styles merged over the chip's own — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * A chip is either a link or a button, never an inert `<div>` with a click
 * handler. `href` discriminates the two so each form forwards exactly the
 * native attributes its element accepts.
 */
type ChipProps = ChipBaseProps &
  (
    | ({ href: string } & Omit<
        ComponentProps<"a">,
        "children" | "className" | "style"
      >)
    | ({ href?: undefined } & Omit<
        ComponentProps<"button">,
        "children" | "className" | "style"
      >)
  );

/**
 * A compact interactive pill: a rounded, bordered control that hovers, focuses,
 * and can read as selected. Renders an `<a>` when `href` is set and a
 * `<button>` otherwise, so it is always reachable by keyboard and announced
 * with the right role.
 *
 * Distinct from `Badge`, which is an inert `<span>` that labels or reports
 * status. If it can be clicked it is a Chip; if it only says something about
 * its neighbour it is a Badge.
 *
 * For a chip that must be a framework `<Link>`, compose `chipSurface` and
 * `chipSize` from `@tuja/ui/components/chip.stylex` directly — the package
 * intentionally stays framework-agnostic.
 */
export function Chip(props: ChipProps) {
  const { children, icon, trailing, size = "md", isActive, css } = props;

  const chipCss = [
    chipSurface.base,
    chipSize[size],
    chipSurface.interactive,
    transition.colors,
    isActive === true && chipSurface.active,
    css,
  ];

  const content = (
    <>
      {icon ? (
        <span css={styles.icon} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
      {trailing ? (
        <span
          css={[styles.trailing, isActive === true && styles.trailingActive]}
        >
          {trailing}
        </span>
      ) : null}
    </>
  );

  // Narrowed before destructuring so each branch's rest object carries only the
  // attributes its element accepts. `css` is pulled out rather than left to
  // travel through the rest spread, so it can be recombined with the chip's own
  // styles below instead of leaking onto the DOM as a raw prop. The unused
  // names are rest siblings, which the lint config ignores.
  if (props.href !== undefined) {
    const {
      children: _children,
      icon: _icon,
      trailing: _trailing,
      size: _size,
      isActive: _isActive,
      css: _css,
      ...anchorProps
    } = props;
    return (
      <a {...anchorProps} css={chipCss}>
        {content}
      </a>
    );
  }

  const {
    children: _children,
    icon: _icon,
    trailing: _trailing,
    size: _size,
    isActive: _isActive,
    css: _css,
    href: _href,
    type = "button",
    ...buttonProps
  } = props;
  return (
    <button aria-pressed={isActive} {...buttonProps} type={type} css={chipCss}>
      {content}
    </button>
  );
}

const styles = stylex.create({
  // `em` boxes so the icon tracks the chip's font-size across sizes.
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
    color: "currentColor",
  },
  // De-emphasised with a token rather than an opacity blend: `trailing` is
  // announced content, and dimming it on the active chip — where `accentOn` on
  // `accent` is already engineered to only just clear 4.5:1 — would drop it
  // through the WCAG 1.4.3 floor.
  trailing: {
    flexShrink: 0,
    color: color.textMuted,
  },
  // On the active fill the muted token has nothing to be muted against, so the
  // trailing content takes the same `accentOn` as the label.
  trailingActive: {
    color: "inherit",
  },
});
