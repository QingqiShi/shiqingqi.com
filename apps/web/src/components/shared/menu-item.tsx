import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useTransition } from "react";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, border, controlSize } from "#src/tokens.stylex.ts";

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
  onBeforeNavigation?: () => void;
  onAfterNavigation?: () => void;
}

export function MenuItem({
  children,
  ariaLabel,
  href,
  isActive,
  autoFocus,
  lang,
  onBeforeNavigation,
  onAfterNavigation,
}: PropsWithChildren<ItemProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      aria-current={isActive ? "true" : undefined}
      lang={lang}
      role="menuitem"
      css={[flex.between, styles.item, isActive && styles.itemActive]}
      data-menu-autofocus={autoFocus ? "true" : undefined}
      tabIndex={isActive ? -1 : 0}
      onClick={(e) => {
        e.preventDefault();

        onBeforeNavigation?.();
        startTransition(() => {
          router.push(href);
        });
        onAfterNavigation?.();
      }}
    >
      {children}
    </a>
  );
}

const styles = stylex.create({
  item: {
    color: { default: color.textMain, ":hover": color.textMuted },
    fontWeight: font.weight_6,
    backgroundColor: { default: null, ":hover": color.backgroundHover },
    borderRadius: border.radius_1,
    fontSize: controlSize._4,
    gap: controlSize._5,
    height: controlSize._9,
    padding: controlSize._3,
    textDecoration: "none",
    transition: "background-color 0.2s",
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${color.controlActive}`,
    },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
  itemActive: {
    color: color.textOnActive,
    backgroundColor: color.controlActive,
    pointerEvents: "none",
  },
});
