import * as stylex from "@stylexjs/stylex";
import type { Breakpoints, LayoutProps } from "../types";
import { LocaleSelector } from "../client-components/locale-selector";
import { ThemeSwitch } from "../client-components/theme-switch";
import { getTranslations } from "../app/translations/getTranslations";
import translations from "./translations.json";

export function Header({ params }: Omit<LayoutProps, "children">) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <header {...stylex.props(styles.container)}>
      <nav {...stylex.props(styles.nav)}>
        <div {...stylex.props(styles.navContent)}>
          <ThemeSwitch
            labels={[t("swithToLight"), t("switchToDark"), t("switchToSystem")]}
          />
          <LocaleSelector
            label={t("localeSelectorLabel")}
            locale={params.locale}
          />
        </div>
      </nav>
    </header>
  );
}

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const md: Breakpoints["md"] =
  "@media (min-width: 768px) and (max-width: 1079px)";
const minLg: Breakpoints["minLg"] = "@media (min-width: 1080px)";
const minXl: Breakpoints["minXl"] = "@media (min-width: 2000px)";

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
    maxWidth: { default: "1080px", [minXl]: "calc((1080 / 24) * 1rem)" },
    marginVertical: 0,
    marginHorizontal: "auto",
    paddingVertical: 0,
    height: "100%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    pointerEvents: "none",
    paddingRight: {
      default: "calc(1rem + env(safe-area-inset-right))",
      [sm]: "calc(1.2rem + env(safe-area-inset-right))",
      [md]: "calc(1.4rem + env(safe-area-inset-right))",
      [minLg]: "calc(1.7rem + env(safe-area-inset-right))",
    },
    paddingLeft: {
      default: "calc(1rem + env(safe-area-inset-left))",
      [sm]: "calc(1.2rem + env(safe-area-inset-left))",
      [md]: "calc(1.4rem + env(safe-area-inset-left))",
      [minLg]: "calc(1.7rem + env(safe-area-inset-left))",
    },
  },
  navContent: {
    pointerEvents: "all",
    display: "flex",
    gap: "0.5rem",
  },
});
