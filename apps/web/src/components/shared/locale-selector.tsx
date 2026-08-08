"use client";

import { TranslateIcon } from "@phosphor-icons/react/dist/ssr/Translate";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "#src/constants.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { MenuItem } from "./menu-item";

interface LocaleSelectorProps {
  /**
   * Visible trigger label. Omit for an icon-only trigger — the accessible name
   * still comes from `ariaLabel`.
   */
  label?: string;
  ariaLabel: string;
  locale: SupportedLocale;
  /**
   * Where the menu expands from. Defaults to MenuButton's own default
   * (downward); pass a `bottom*` corner when the trigger sits near the bottom
   * of the viewport, e.g. in a sidebar's utility row.
   */
  menuPosition?: ComponentProps<typeof MenuButton>["position"];
  /** Trigger size, forwarded to the underlying Button. Defaults to `"md"`. */
  size?: ComponentProps<typeof MenuButton>["buttonProps"]["size"];
}

/**
 * The site's language picker. It owns its own Suspense boundary because it owns
 * the hook that needs one: `useSearchParams` (below, so switching language keeps
 * the query string) makes everything up to the nearest boundary client-rendered
 * on a statically rendered route. Left to the callers, the nearest boundary is
 * `[locale]/layout.tsx`'s wrapper around the whole page, so every prerendered
 * route — the 404, the design-system pages — ships an empty body and paints
 * nothing until hydration. Keeping the boundary here fixes that for all three
 * call sites at once, and for the fourth nobody has written yet.
 *
 * The fallback is a disabled copy of the trigger rather than `null` so the
 * picker's box is reserved in the prerendered HTML and the chrome beside it
 * doesn't jump when the real one hydrates. It is `aria-hidden` and out of the tab
 * order: it does nothing, so it should not be offered.
 */
export function LocaleSelector(props: LocaleSelectorProps) {
  const { label, size } = props;

  return (
    <Suspense
      fallback={
        <Button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          disabled
          icon={<TranslateIcon weight="bold" role="presentation" />}
          hideLabelOnMobile
          size={size}
        >
          {label && <span>{label}</span>}
        </Button>
      }
    >
      <LocaleSelectorMenu {...props} />
    </Suspense>
  );
}

function LocaleSelectorMenu({
  label,
  ariaLabel,
  locale,
  menuPosition,
  size,
}: LocaleSelectorProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const searchString = searchParams.size ? `?${searchParams.toString()}` : "";

  // Locale changes how every route renders, so drop the client router cache
  // and prefetch entries created before the switch — replayed as-is, they
  // would show the old locale.
  const refreshRoute = () => {
    router.refresh();
  };

  return (
    <MenuButton
      position={menuPosition}
      buttonProps={{
        type: "button",
        "aria-label": ariaLabel,
        icon: <TranslateIcon weight="bold" role="presentation" />,
        hideLabelOnMobile: true,
        size,
      }}
      menuContent={
        <div css={[flex.col, styles.menu]}>
          <MenuItem
            ariaLabel="Switch to English"
            href={`${getLocalePath(pathname, "en")}${searchString}`}
            isActive={locale === "en"}
            autoFocus={locale !== "en"}
            lang="en"
            onNavigation={refreshRoute}
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
            onNavigation={refreshRoute}
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
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};max-age=${String(LOCALE_COOKIE_MAX_AGE_SECONDS)};path=/;SameSite=Lax${secure}`;
}

const styles = stylex.create({
  menu: {
    gap: controlSize._1,
    overflow: "hidden",
    padding: controlSize._1,
  },
});
