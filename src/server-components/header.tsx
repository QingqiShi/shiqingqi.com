import * as x from "@stylexjs/stylex";
import { Breakpoints, LayoutProps } from "../types";
import { Button } from "./button";
import { ThemeSwitch } from "../client-components/theme-switch";
import { getTranslations } from "../app/translations/getTranslations";
import translations from "./translations.json";

export function Header({ params }: Omit<LayoutProps, "children">) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <div {...x.props(styles.container)}>
      <nav {...x.props(styles.nav)}>
        <div {...x.props(styles.navContent)}>
          <Button>locale selector</Button>
          <ThemeSwitch
            labels={[t("swithToLight"), t("switchToDark"), t("switchToSystem")]}
          />
        </div>
      </nav>
    </div>
  );
}

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
    paddingLeft: "calc(1rem + env(safe-area-inset-left))",
    paddingRight: "calc(1rem + env(safe-area-inset-right))",
    height: "100%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    pointerEvents: "none",
  },
  navContent: {
    pointerEvents: "all",
    display: "flex",
    gap: "0.5rem",
  },
});
