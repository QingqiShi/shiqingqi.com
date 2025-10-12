import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";
import { BackButton } from "@/components/shared/back-button";
import { LocaleSelector } from "@/components/shared/locale-selector";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { layer, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

interface HeaderProps {
  locale: SupportedLocale;
}

export function Header({ locale }: HeaderProps) {
  const { t } = getTranslations(translations, locale);

  return (
    <header css={styles.container}>
      <nav css={styles.nav}>
        <div css={styles.navContent}>
          <BackButton locale={locale} label={t("backLabel")} />
        </div>
        <div css={styles.navContent}>
          <ThemeSwitch
            labels={[
              t("switchToLight"),
              t("switchToDark"),
              t("switchToSystem"),
            ]}
          />
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
    paddingRight: "var(--removed-body-scroll-bar-size)",
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
