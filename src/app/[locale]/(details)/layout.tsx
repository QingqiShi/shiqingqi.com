import * as stylex from "@stylexjs/stylex";
import { BackButton } from "../../../client-components/back-button";
import type { LayoutProps } from "../../../types";
import { getTranslations } from "../../translations/getTranslations";
import translations from "./translations.json";

export default function Layout({ children, params }: LayoutProps) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <div>
      <header {...stylex.props(styles.header)}>
        <BackButton locale={params.locale} label={t("backLabel")} />
      </header>
      <article>{children}</article>
    </div>
  );
}

const styles = stylex.create({
  header: {
    marginBottom: "2rem",
  },
});
