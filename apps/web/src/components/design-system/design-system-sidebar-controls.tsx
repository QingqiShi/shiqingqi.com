import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { LocaleSelector } from "#src/components/shared/locale-selector.tsx";
import { ThemeSwitch } from "#src/components/shared/theme-switch.tsx";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";

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
          t({ en: "Switch to system theme", zh: "切换至系统颜色模式" }),
        ]}
      />
    </div>
  );
}

const styles = stylex.create({
  controls: {
    gap: space._2,
    alignItems: "center",
    justifyContent: "space-between",
  },
});
