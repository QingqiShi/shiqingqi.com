import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { SupportedLocale } from "@tuja/i18n/types";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { LocaleSelector } from "#src/site-shell/locale-selector.tsx";
import { ThemeSwitch } from "#src/theme/theme-switch.tsx";

/**
 * Utility region pinned to the bottom of the design-system sidebar — the
 * theme toggle and language picker that header-driven pages get from the
 * fixed header chrome, sat side by side as compact icon controls above a
 * hairline divider.
 */
export function DesignSystemSidebarControls({
  locale,
}: {
  locale: SupportedLocale;
}) {
  return (
    <div css={[flex.row, styles.controls]}>
      <LocaleSelector
        size="sm"
        ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
        locale={locale}
        menuPosition="bottomLeft"
      />
      <ThemeSwitch
        size="sm"
        labels={[
          t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
          t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
        ]}
      />
    </div>
  );
}

const styles = stylex.create({
  controls: {
    gap: rhythm.item,
    alignItems: "center",
    justifyContent: "space-between",
  },
});
