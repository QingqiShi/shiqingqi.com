import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

interface PageTitleProps {
  locale: SupportedLocale;
  type: "experience" | "education";
  title: string;
  role: string;
  date: string;
}

export function PageTitle({ locale, type, title, role, date }: PageTitleProps) {
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
    fontSize: font.size_0,
    fontWeight: font.weight_7,
    color: color.textMuted,
    margin: 0,
  },
  title: {
    fontSize: font.size_5,
    margin: 0,
  },
  date: {
    display: "block",
    fontSize: font.size_0,
    color: color.textMuted,
  },
});
