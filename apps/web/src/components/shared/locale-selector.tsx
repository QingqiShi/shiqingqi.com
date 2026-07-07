"use client";

import { TranslateIcon } from "@phosphor-icons/react/dist/ssr/Translate";
import * as stylex from "@stylexjs/stylex";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { LOCALE_COOKIE_NAME } from "#src/constants.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { MenuItem } from "./menu-item";

interface LocaleSelectorProps {
  label: string;
  ariaLabel: string;
  locale: SupportedLocale;
  /**
   * Where the menu expands from. Defaults to MenuButton's own default
   * (downward); pass a `bottom*` corner when the trigger sits near the bottom
   * of the viewport, e.g. in a sidebar's utility row.
   */
  menuPosition?: ComponentProps<typeof MenuButton>["position"];
}

export function LocaleSelector({
  label,
  ariaLabel,
  locale,
  menuPosition,
}: LocaleSelectorProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const searchString = searchParams.size ? `?${searchParams.toString()}` : "";

  return (
    <MenuButton
      position={menuPosition}
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
            lang="en"
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
            lang="zh"
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
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};max-age=${String(maxAge)};path=/;SameSite=Lax${secure}`;
}

const styles = stylex.create({
  menu: {
    gap: controlSize._1,
    overflow: "hidden",
    padding: controlSize._1,
  },
});
