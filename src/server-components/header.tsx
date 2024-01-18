import * as x from "@stylexjs/stylex";
import type { Breakpoints, LayoutProps } from "../types";
import { LocaleSelector } from "../client-components/locale-selector";
import { ThemeSwitch } from "../client-components/theme-switch";
import { getTranslations } from "../app/translations/getTranslations";
import translations from "./translations.json";

export function Header({ params }: Omit<LayoutProps, "children">) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <div {...x.props(styles.container)}>
      <nav {...x.props(styles.nav)}>
        <div {...x.props(styles.navContent)}>
          <LocaleSelector label={t("localeSelectorLabel")} />
          <ThemeSwitch
            labels={[t("swithToLight"), t("switchToDark"), t("switchToSystem")]}
          />
        </div>
      </nav>
    </div>
  );
}

const sm: Breakpoints["sm"] = "@media (min-width: 320px)";
const md: Breakpoints["md"] = "@media (min-width: 768px)";
const lg: Breakpoints["lg"] = "@media (min-width: 1080px)";
const xl: Breakpoints["xl"] = "@media (min-width: 2000px)";

const styles = x.create({
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
    maxWidth: { default: "1080px", [xl]: "calc((1080 / 24) * 1rem)" },
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
      [lg]: "calc(1.7rem + env(safe-area-inset-right))",
    },
    paddingLeft: {
      default: "calc(1rem + env(safe-area-inset-left))",
      [sm]: "calc(1.2rem + env(safe-area-inset-left))",
      [md]: "calc(1.4rem + env(safe-area-inset-left))",
      [lg]: "calc(1.7rem + env(safe-area-inset-left))",
    },
  },
  navContent: {
    pointerEvents: "all",
    display: "flex",
    gap: "0.5rem",
  },
});
