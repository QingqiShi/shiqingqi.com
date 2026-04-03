"use client";

import { TranslateIcon } from "@phosphor-icons/react/dist/ssr/Translate";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_COOKIE_NAME } from "#src/constants.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { controlSize } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
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
        <div css={[flex.col, styles.menu]}>
          <MenuItem
            ariaLabel="Switch to English"
            href={`${getLocalePath(pathname, "en")}${searchString}`}
            isActive={locale === "en"}
            autoFocus={locale !== "en"}
            onBeforeNavigation={() => {
              // next-i18n-router respects the locale cookie, so we must keep
              // it in sync to avoid reverting locale on reload or root navigation.
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
            onBeforeNavigation={() => {
              setLocaleCookie("zh");
            }}
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
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};max-age=${maxAge};path=/;SameSite=Lax${secure}`;
}

const styles = stylex.create({
  menu: {
    gap: controlSize._1,
    overflow: "hidden",
    padding: controlSize._1,
  },
});
