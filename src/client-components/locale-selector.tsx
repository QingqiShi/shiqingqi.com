"use client";

import { Translate } from "@phosphor-icons/react/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname } from "next/navigation";
import React, { useRef, useSyncExternalStore } from "react";
import { breakpoints } from "@/breakpoints";
import { useClickAway } from "@/hooks/use-click-away";
import { Anchor } from "@/server-components/anchor";
import { anchorTokens } from "@/server-components/anchor.stylex";
import { Button } from "@/server-components/button";
import { border, color, controlSize, shadow, space } from "@/tokens.stylex";
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

  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const desktopButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useClickAway<HTMLDivElement>((e) => {
    if (
      isMenuShown &&
      e.target !== mobileButtonRef.current &&
      e.target !== desktopButtonRef.current
    ) {
      setIsMenuShown(false);
    }
  });

  const pathname = usePathname();

  return (
    <div css={styles.container}>
      <Button
        ref={desktopButtonRef}
        type="button"
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={ariaLabel}
        onClick={() => {
          setIsMenuShown(!isMenuShown);
        }}
        icon={<Translate weight="bold" role="presentation" />}
        css={styles.desktopVisible}
      >
        {label}
      </Button>
      <Button
        ref={mobileButtonRef}
        type="button"
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={ariaLabel}
        onClick={() => {
          setIsMenuShown(!isMenuShown);
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
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_2,
    boxShadow: shadow._2,
    display: "flex",
    flexDirection: "column",
    gap: controlSize._1,
    opacity: 0,
    overflow: "hidden",
    padding: controlSize._1,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: `calc(100% + ${space._1})`,
    transform: "scale(0, 0)",
    transformOrigin: "top right",
    transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
  },
  menuShown: {
    opacity: 1,
    pointerEvents: "all",
    transform: "scale(1, 1)",
  },
  item: {
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
    [anchorTokens.color]: color.textOnActive,
    backgroundColor: color.controlActive,
    pointerEvents: "none",
  },
});
