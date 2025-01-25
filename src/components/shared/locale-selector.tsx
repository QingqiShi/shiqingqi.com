"use client";

import { Translate } from "@phosphor-icons/react/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import React, { useRef, useSyncExternalStore } from "react";
import type { Anchor } from "@/components/shared/anchor";
import { Button } from "@/components/shared/button";
import { LOCALE_COOKIE_NAME } from "@/constants";
import { useClickAway } from "@/hooks/use-click-away";
import {
  border,
  color,
  controlSize,
  font,
  shadow,
  space,
} from "@/tokens.stylex";
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
        hideLabelOnMobile
      >
        {label}
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
          ariaLabel="Switch to English"
          flag="🇬🇧"
          href={getLocalePath(pathname, "en")}
          isActive={locale === "en"}
          label="English"
          locale="en"
          tabIndex={!isMenuShown ? -1 : undefined}
        />
        <Item
          ariaLabel="切换至中文"
          flag="🇨🇳"
          href={getLocalePath(pathname, "zh")}
          isActive={locale === "zh"}
          label="中文"
          locale="zh"
          tabIndex={!isMenuShown ? -1 : undefined}
        />
      </div>
    </div>
  );
}

interface ItemProps extends React.ComponentProps<typeof Anchor> {
  ariaLabel: string;
  flag: string;
  href: string;
  isActive?: boolean;
  label: string;
  locale: SupportedLocale;
  tabIndex?: number;
}

function Item({
  ariaLabel,
  flag,
  href,
  isActive,
  label,
  locale,
  tabIndex,
}: ItemProps) {
  const router = useRouter();

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      role="menuItem"
      css={[styles.item, isActive && styles.itemActive]}
      onClick={(e) => {
        e.preventDefault();

        // set cookie for next-i18n-router
        const days = 30;
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${LOCALE_COOKIE_NAME}=${locale};expires=${date.toUTCString()};path=/`;

        // redirect to the new locale path
        router.push(href);
        router.refresh();
      }}
    >
      <span>{label}</span>
      <span>{flag}</span>
    </a>
  );
}

const styles = stylex.create({
  container: {
    position: "relative",
    display: "flex",
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
    viewTransitionName: "local-selector-menu",
    transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
  },
  menuShown: {
    opacity: 1,
    pointerEvents: "all",
    transform: "scale(1, 1)",
  },
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
