"use client";

import { TranslateIcon } from "@phosphor-icons/react/dist/ssr/Translate";
import * as stylex from "@stylexjs/stylex";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { setLocaleCookie } from "@tuja/i18n/set-locale-cookie";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import { htmlLang } from "#src/i18n/i18n-config.ts";
import { MenuItem } from "./menu-item";

interface LocaleSelectorProps {
  /** Accessible name of the icon-only trigger. */
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
  const { ariaLabel, size } = props;

  return (
    <Suspense
      fallback={
        <Button
          type="button"
          // `aria-hidden` makes the name inert; the Button type demands one
          // for an icon-only button all the same.
          aria-label={ariaLabel}
          aria-hidden="true"
          tabIndex={-1}
          disabled
          icon={<TranslateIcon weight="bold" role="presentation" />}
          size={size}
        />
      }
    >
      <LocaleSelectorMenu {...props} />
    </Suspense>
  );
}

function LocaleSelectorMenu({
  ariaLabel,
  locale,
  menuPosition,
  size,
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
        size,
      }}
      menuContent={
        <div css={[flex.col, styles.menu]}>
          <MenuItem
            ariaLabel="Switch to English"
            href={`${getLocalePath(pathname, "en")}${searchString}`}
            isActive={locale === "en"}
            autoFocus={locale !== "en"}
            lang={htmlLang.en}
            onClick={() => {
              // The server reads the Preference from this cookie, so write it
              // before the browser follows the link.
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
            lang={htmlLang.zh}
            onClick={() => {
              setLocaleCookie("zh");
            }}
          >
            <span>中文</span>
            <span>🇨🇳</span>
          </MenuItem>
        </div>
      }
    />
  );
}

const styles = stylex.create({
  menu: {
    overflow: "hidden",
    padding: controlSize._1,
  },
});
