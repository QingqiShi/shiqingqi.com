import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { BackButton } from "#src/components/shared/back-button.tsx";
import { FixedContainerContent } from "#src/components/shared/fixed-container-content.tsx";
import { LocaleSelector } from "#src/components/shared/locale-selector.tsx";
import { ThemeSwitch } from "#src/components/shared/theme-switch.tsx";
import { layer, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import translations from "./translations.json";

interface HeaderProps {
  locale: SupportedLocale;
}

export function Header({ locale }: HeaderProps) {
  const { t } = getTranslations(translations, locale);

  return (
    <header css={styles.container}>
      <nav css={styles.nav}>
        <FixedContainerContent css={styles.navContent}>
          <BackButton locale={locale} label={t("backLabel")} />
        </FixedContainerContent>
        <div css={styles.navContent}>
          <FixedContainerContent>
            <ThemeSwitch
              labels={[
                t("switchToLight"),
                t("switchToDark"),
                t("switchToSystem"),
              ]}
            />
          </FixedContainerContent>
          <LocaleSelector
            label={t("localeSelectorLabel")}
            ariaLabel={t("localeSelectorAriaLabel")}
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
    top: "env(safe-area-inset-top)",
    right: 0,
    left: 0,
    height: space._10,
    zIndex: layer.header,
    pointerEvents: "none",
    paddingRight: "var(--removed-body-scroll-bar-size, 0px)",
  },
  nav: {
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    height: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "none",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  navContent: {
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
});
