import * as stylex from "@stylexjs/stylex";
import { BackButton } from "#src/components/shared/back-button.tsx";
import { FixedContainerContent } from "#src/components/shared/fixed-container-content.tsx";
import { LocaleSelector } from "#src/components/shared/locale-selector.tsx";
import { ThemeSwitch } from "#src/components/shared/theme-switch.tsx";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { layer, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";

interface HeaderProps {
  locale: SupportedLocale;
}

export function Header({ locale }: HeaderProps) {
  return (
    <header css={styles.container}>
      <nav css={[flex.between, styles.nav]}>
        <FixedContainerContent css={[flex.row, styles.navContent]}>
          <BackButton locale={locale} label={t({ en: "Back", zh: "返回" })} />
        </FixedContainerContent>
        <div css={[flex.row, styles.navContent]}>
          <FixedContainerContent>
            <ThemeSwitch
              labels={[
                t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
                t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
                t({ en: "Switch to system theme", zh: "切换至系统颜色模式" }),
              ]}
            />
          </FixedContainerContent>
          <LocaleSelector
            label={t({ en: "Language", zh: "语言" })}
            ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
            locale={locale}
          />
        </div>
      </nav>
    </header>
  );
}

const styles = stylex.create({
  container: {
    position: "fixed",
    top: 0,
    right: 0,
    left: 0,
    height: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingTop: "env(safe-area-inset-top)",
    zIndex: layer.header,
    pointerEvents: "none",
    paddingRight: "var(--removed-body-scroll-bar-size, 0px)",
  },
  nav: {
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    height: "100%",
    pointerEvents: "none",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  navContent: {
    pointerEvents: "all",
    gap: space._1,
  },
});
