import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, font, controlSize } from "@tuja/ui/tokens.stylex";
import type { MouseEventHandler, PropsWithChildren } from "react";

interface ItemProps {
  ariaLabel?: string;
  autoFocus?: boolean;
  href: string;
  isActive?: boolean;
  /**
   * BCP-47 language tag for the item content. Forwarded to the underlying
   * `<a>` so the accessible name and visible text are pronounced with the
   * correct language's phonology — required by WCAG 3.1.2 (Language of
   * Parts) when the item is in a different language from the page.
   */
  lang?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * One item in a menu: a link the browser follows itself. Not `router.push` — a
 * soft navigation keeps client caches that the link's destination may
 * invalidate; the caller decides what the destination means.
 */
export function MenuItem({
  children,
  ariaLabel,
  href,
  isActive,
  autoFocus,
  lang,
  onClick,
}: PropsWithChildren<ItemProps>) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      aria-current={isActive ? "true" : undefined}
      lang={lang}
      role="menuitem"
      css={[
        flex.between,
        corner.radius_1,
        styles.item,
        a11y.focusRing,
        isActive && styles.itemActive,
      ]}
      data-menu-autofocus={autoFocus ? "true" : undefined}
      tabIndex={isActive ? -1 : 0}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

const styles = stylex.create({
  item: {
    color: { default: color.textMain, ":hover": color.textMuted },
    fontWeight: font.weight_6,
    backgroundColor: { default: null, ":hover": color.bgInteractiveHover },
    fontSize: controlSize._4,
    gap: controlSize._5,
    height: controlSize._9,
    padding: controlSize._3,
    textDecoration: "none",
    transition: "background-color 0.2s",
  },
  itemActive: {
    color: color.accentOn,
    backgroundColor: color.accent,
    pointerEvents: "none",
  },
});
