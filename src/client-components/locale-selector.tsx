"use client";

import { Translate } from "@phosphor-icons/react/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname } from "next/navigation";
import React, { useSyncExternalStore } from "react";
import { breakpoints } from "@/breakpoints";
import { useClickAway } from "@/hooks/use-click-away";
import { Anchor } from "@/server-components/anchor";
import { Button } from "@/server-components/button";
import { tokens } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getLocalePath } from "@/utils/pathname";

/*
 * When route changes (on selecting a different locale) the entire page will unmount, as a result states will
 * reset and the locale menu will be closed, to work around this we need a global state and hydrate it back when
 * the component mounts again. Note this assumes there's only a single instance of the locale selector.
 */
const listeners: Set<() => void> = new Set();
function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
let isMenuShownSingleton = false;
function setIsMenuShown(newState: boolean) {
  isMenuShownSingleton = newState;
  listeners.forEach((listener) => {
    listener();
  });
}

interface LocaleSelectorProps {
  label: string;
  ariaLabel: string;
  locale: SupportedLocale;
}

export function LocaleSelector({
  label,
  ariaLabel,
  locale,
}: LocaleSelectorProps) {
  const isMenuShown = useSyncExternalStore(
    subscribe,
    () => isMenuShownSingleton,
    () => isMenuShownSingleton
  );

  const menuRef = useClickAway<HTMLDivElement>(
    () => isMenuShown && setIsMenuShown(false)
  );

  const pathname = usePathname();

  return (
    <div css={styles.container}>
      <Button
        type="button"
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={ariaLabel}
        onClick={() => {
          setIsMenuShown(true);
        }}
        icon={<Translate weight="bold" role="presentation" />}
        css={styles.desktopVisible}
      >
        {label}
      </Button>
      <Button
        type="button"
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={ariaLabel}
        onClick={() => {
          setIsMenuShown(true);
        }}
        css={styles.mobileVisible}
      >
        <Translate weight="bold" role="presentation" />
      </Button>
      <div
        id="language-selector-menu"
        role="menu"
        aria-hidden={!isMenuShown}
        ref={menuRef}
        onBlur={(e) => {
          if (!menuRef.current?.contains(e.relatedTarget)) {
            setIsMenuShown(false);
          }
        }}
        css={[styles.menu, isMenuShown && styles.menuShown]}
      >
        <Item
          label="English"
          flag="🇬🇧"
          ariaLabel="Switch to English"
          href={getLocalePath(pathname, "en")}
          tabIndex={!isMenuShown ? -1 : undefined}
          isActive={locale === "en"}
        />
        <Item
          label="中文"
          flag="🇨🇳"
          ariaLabel="切换至中文"
          href={getLocalePath(pathname, "zh")}
          tabIndex={!isMenuShown ? -1 : undefined}
          isActive={locale === "zh"}
        />
      </div>
    </div>
  );
}

interface ItemProps extends React.ComponentProps<typeof Anchor> {
  label: string;
  ariaLabel: string;
  flag: string;
  href: string;
  tabIndex?: number;
  isActive?: boolean;
}

function Item({ label, ariaLabel, flag, href, tabIndex, isActive }: ItemProps) {
  return (
    <Anchor
      href={href}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      role="menuItem"
      css={[styles.item, isActive && styles.itemActive]}
      scroll={false}
    >
      <span>{label}</span>
      <span>{flag}</span>
    </Anchor>
  );
}

const styles = stylex.create({
  container: {
    position: "relative",
    display: "flex",
  },
  desktopVisible: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  mobileVisible: {
    display: { default: "inline-flex", [breakpoints.md]: "none" },
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    position: "absolute",
    right: 0,
    top: "calc(100% + 12px)",
    borderRadius: "12px",
    opacity: 0,
    padding: "4.8px",
    transform: "scale(0, 0)",
    transformOrigin: "top right",
    transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
    overflow: "hidden",
    pointerEvents: "none",
    backgroundColor: tokens.backgroundRaised,
    boxShadow: tokens.shadowRaised,
  },
  menuShown: {
    transform: "scale(1, 1)",
    opacity: 1,
    pointerEvents: "all",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    textDecoration: "none",
    paddingBlock: "12px",
    paddingInline: "24px",
    fontSize: "19.2px",
    borderRadius: "7.2px",
    color: tokens.textMuted,
    transition: "background-color 0.2s",
    gap: "12px",
    backgroundColor: { default: null, ":hover": tokens.backgroundHover },
  },
  itemActive: {
    pointerEvents: "none",
    color: tokens.textOnActive,
    backgroundColor: tokens.controlActive,
  },
});
