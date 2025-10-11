"use client";

import { TranslateIcon } from "@phosphor-icons/react/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useSearchParams } from "next/navigation";
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

  const searchString = searchParams.size ? `?${searchParams.toString()}` : "";

  return (
    <MenuButton
      buttonProps={{
        type: "button",
        "aria-label": ariaLabel,
        icon: <TranslateIcon weight="bold" role="presentation" />,
        hideLabelOnMobile: true,
      }}
      menuContent={
        <div css={styles.menu}>
          <MenuItem
            ariaLabel="Switch to English"
            href={`${getLocalePath(pathname, "en")}${searchString}`}
            isActive={locale === "en"}
            autoFocus={locale !== "en"}
            onBeforeNavigation={() => {
              // next-i18n-router will always respect the locale cookie when navigating to a path without prefix
              // to avoid switching language on reload, we need to set the cookie to "en" manually.
              setLocaleCookie("en");
            }}
          >
            <span>English</span>
            <span>🇬🇧</span>
          </MenuItem>
          <MenuItem
            ariaLabel="切换至中文"
            href={`${getLocalePath(pathname, "zh")}${searchString}`}
            isActive={locale === "zh"}
            autoFocus={locale === "en"}
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
  const maxAge = 31536000; // 1 year in seconds
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};maxAge=${maxAge};path=/;SameSite=Lax`;
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
