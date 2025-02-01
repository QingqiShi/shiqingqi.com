import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { color, font, border, controlSize } from "@/tokens.stylex";

interface ItemProps {
  ariaLabel?: string;
  autoFocus?: boolean;
  href: string;
  isActive?: boolean;
  onBeforeNavigation?: () => void;
  onAfterNavigation?: () => void;
}

export function MenuItem({
  children,
  ariaLabel,
  href,
  isActive,
  autoFocus,
  onBeforeNavigation,
  onAfterNavigation,
}: PropsWithChildren<ItemProps>) {
  const router = useRouter();

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      role="menuItem"
      css={[styles.item, isActive && styles.itemActive]}
      ref={(el) => {
        if (autoFocus) el?.focus();
      }}
      tabIndex={isActive ? -1 : 0}
      onClick={(e) => {
        e.preventDefault();

        onBeforeNavigation?.();
        router.push(href);
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
    alignItems: "center",
    backgroundColor: { default: null, ":hover": color.backgroundHover },
    borderRadius: border.radius_1,
    display: "flex",
    fontSize: controlSize._4,
    gap: controlSize._5,
    height: controlSize._9,
    justifyContent: "space-between",
    padding: controlSize._3,
    textDecoration: "none",
    transition: "background-color 0.2s",
  },
  itemActive: {
    color: color.textOnActive,
    backgroundColor: color.controlActive,
    pointerEvents: "none",
  },
});
