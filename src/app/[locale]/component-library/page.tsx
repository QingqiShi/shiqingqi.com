import * as stylex from "@stylexjs/stylex";
import { ViewTransition } from "react";
import { font, space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import translations from "./translations.json";

export default async function ComponentLibrary(props: PageProps) {
  const { locale } = await props.params;
  const { t } = getTranslations(translations, locale);

  return (
    <div css={styles.container}>
      <ViewTransition name={`project-card-name-${t("heading")}`}>
        <h1 css={styles.heading}>{t("heading")}</h1>
      </ViewTransition>
      <p css={styles.message}>{t("comingSoon")}</p>
    </div>
  );
}

const styles = stylex.create({
  container: {
    padding: `${space._6} 0`,
  },
  heading: {
    margin: `0 0 ${space._4} 0`,
    fontSize: font.size_6,
    fontWeight: font.weight_8,
  },
  message: {
    margin: 0,
    fontSize: font.size_3,
  },
});
