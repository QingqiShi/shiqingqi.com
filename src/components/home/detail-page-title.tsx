import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import translations from "../../app/[locale]/(home)/(details)/translations.json";

interface PageTitleProps {
  type: "experience" | "education";
  title: string;
  role: string;
  date: string;
  locale: SupportedLocale;
}

export function DetailPageTitle({
  date,
  locale,
  role,
  title,
  type,
}: PageTitleProps) {
  const { t } = getTranslations(translations, locale);

  return (
    <header css={styles.container}>
      <h2 css={styles.subtitle}>
        {t(type)} - {title}
      </h2>
      <h1 css={styles.title}>{role}</h1>
      <time css={styles.date}>{date}</time>
    </header>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBottom: space._8,
  },
  subtitle: {
    fontSize: font.vpHeading3,
    fontWeight: font.weight_7,
    color: color.textMuted,
    margin: 0,
  },
  title: {
    fontSize: font.vpHeading1,
    margin: 0,
  },
  date: {
    display: "block",
    fontSize: font.uiBody,
    color: color.textMuted,
  },
});
