"use client";

import React, { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import * as stylex from "@stylexjs/stylex";
import { Translate } from "@phosphor-icons/react";
import { useClickAway } from "../hooks/use-click-away";
import { Button } from "../server-components/button";
import { tokens } from "../tokens.stylex";
import { Anchor } from "../server-components/anchor";
import type { SupportedLocale } from "../types";
import { getLocalePath } from "../utils/pathname";

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
  listeners.forEach((listener) => listener());
}

interface LocaleSelectorProps {
  label: string;
  locale: SupportedLocale;
}

export function LocaleSelector({ label, locale }: LocaleSelectorProps) {
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
    <div {...stylex.props(styles.container)}>
      <Button
        type="button"
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={label}
        onClick={() => setIsMenuShown(true)}
      >
        <Translate />
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
        {...stylex.props(styles.menu, isMenuShown && styles.menuShown)}
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
      style={[styles.item, isActive && styles.itemActive]}
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
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    position: "absolute",
    right: 0,
    top: "calc(100% + 0.5rem)",
    borderRadius: "0.5rem",
    opacity: 0,
    padding: "0.2rem",
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
    paddingVertical: "0.5rem",
    paddingHorizontal: "1rem",
    fontSize: "0.8rem",
    borderRadius: "0.3rem",
    color: tokens.textMuted,
    transition: "background-color 0.2s",
    gap: "0.5rem",
    backgroundColor: { default: null, ":hover": tokens.backgroundHover },
  },
  itemActive: {
    pointerEvents: "none",
    color: tokens.textOnActive,
    backgroundColor: tokens.controlActive,
  },
});
