"use client";

import { Translate } from "@phosphor-icons/react/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import type { Anchor } from "@/components/shared/anchor";
import { LOCALE_COOKIE_NAME } from "@/constants";
import { border, color, controlSize, font } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getLocalePath } from "@/utils/pathname";
import { MenuButton } from "./menu-button";

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
  const pathname = usePathname();

  return (
    <MenuButton
      buttonProps={{
        type: "button",
        "aria-label": ariaLabel,
        icon: <Translate weight="bold" role="presentation" />,
        hideLabelOnMobile: true,
      }}
      menuContent={
        <div css={styles.menu}>
          <Item
            ariaLabel="Switch to English"
            flag="🇬🇧"
            href={getLocalePath(pathname, "en")}
            isActive={locale === "en"}
            label="English"
            locale="en"
            autoFocus={locale !== "en"}
          />
          <Item
            ariaLabel="切换至中文"
            flag="🇨🇳"
            href={getLocalePath(pathname, "zh")}
            isActive={locale === "zh"}
            label="中文"
            locale="zh"
            autoFocus={locale === "en"}
          />
        </div>
      }
    >
      {label}
    </MenuButton>
  );
}

interface ItemProps extends React.ComponentProps<typeof Anchor> {
  ariaLabel: string;
  flag: string;
  href: string;
  isActive?: boolean;
  label: string;
  locale: SupportedLocale;
  autoFocus?: boolean;
}

function Item({
  ariaLabel,
  flag,
  href,
  isActive,
  label,
  locale,
  autoFocus,
}: ItemProps) {
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
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: controlSize._1,
    overflow: "hidden",
    padding: controlSize._1,
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
