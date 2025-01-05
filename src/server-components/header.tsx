import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { breakpoints } from "@/breakpoints";
import { BackButton } from "@/client-components/back-button";
import { LocaleSelector } from "@/client-components/locale-selector";
import { ThemeSwitch } from "@/client-components/theme-switch";
import { space } from "@/tokens.stylex";
import type { LayoutProps } from "@/types";
import translations from "./translations.json";

export async function Header({ params }: Omit<LayoutProps, "children">) {
  const { locale } = await params;
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
    top: 0,
    right: 0,
    left: 0,
    height: "5rem",
    zIndex: 100,
    pointerEvents: "none",
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
