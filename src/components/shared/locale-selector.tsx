"use client";

import { Translate } from "@phosphor-icons/react/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { LOCALE_COOKIE_NAME } from "@/constants";
import { controlSize } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getLocalePath } from "@/utils/pathname";
import { MenuButton } from "./menu-button";
import { MenuItem } from "./menu-item";

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const searchString = searchParams.size ? `?${searchParams.toString()}` : "";

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
          <MenuItem
            ariaLabel="Switch to English"
            href={`${getLocalePath(pathname, "en")}${searchString}`}
            isActive={locale === "en"}
            autoFocus={locale !== "en"}
            onBeforeNavigation={() => setLocaleCookie("en")}
            onAfterNavigation={() => router.refresh()}
          >
            <span>English</span>
            <span>🇬🇧</span>
          </MenuItem>
          <MenuItem
            ariaLabel="切换至中文"
            href={`${getLocalePath(pathname, "zh")}${searchString}`}
            isActive={locale === "zh"}
            autoFocus={locale === "en"}
            onBeforeNavigation={() => setLocaleCookie("zh")}
            onAfterNavigation={() => router.refresh()}
          >
            <span>中文</span>
            <span>🇨🇳</span>
          </MenuItem>
        </div>
      }
    >
      {label}
    </MenuButton>
  );
}

function setLocaleCookie(locale: SupportedLocale) {
  // set cookie for next-i18n-router
  const days = 30;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};expires=${date.toUTCString()};path=/`;
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
});
