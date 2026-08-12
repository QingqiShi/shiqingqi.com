import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, font, controlSize } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useTransition } from "react";

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
  /**
   * Runs inside the same transition as the navigation, right after
   * `router.push`. For follow-up router work that must batch with the
   * navigation — e.g. a `router.refresh()` that flushes client caches made
   * stale by what the navigation changes. `onAfterNavigation` runs outside
   * the transition and cannot do this.
   */
  onNavigation?: () => void;
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
  onNavigation,
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
      css={[
        flex.between,
        corner.radius_1,
        styles.item,
        a11y.focusRing,
        isActive && styles.itemActive,
      ]}
      data-menu-autofocus={autoFocus ? "true" : undefined}
      tabIndex={isActive ? -1 : 0}
      onClick={(e) => {
        e.preventDefault();

        onBeforeNavigation?.();
        startTransition(() => {
          router.push(href);
          onNavigation?.();
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
