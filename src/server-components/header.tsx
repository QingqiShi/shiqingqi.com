import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { breakpoints } from "@/breakpoints";
import { BackButton } from "@/client-components/back-button";
import { LocaleSelector } from "@/client-components/locale-selector";
import { ThemeSwitch } from "@/client-components/theme-switch";
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
    paddingRight: {
      default: "calc(1rem + env(safe-area-inset-right))",
      [breakpoints.sm]: "calc(1.2rem + env(safe-area-inset-right))",
      [breakpoints.md]: "calc(1.4rem + env(safe-area-inset-right))",
      [breakpoints.lg]: "calc(1.7rem + env(safe-area-inset-right))",
    },
    paddingLeft: {
      default: "calc(1rem + env(safe-area-inset-left))",
      [breakpoints.sm]: "calc(1.2rem + env(safe-area-inset-left))",
      [breakpoints.md]: "calc(1.4rem + env(safe-area-inset-left))",
      [breakpoints.lg]: "calc(1.7rem + env(safe-area-inset-left))",
    },
  },
  navContent: {
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
});
