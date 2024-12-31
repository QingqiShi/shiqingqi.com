import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { tokens } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
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
    paddingBottom: "3rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  subtitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: tokens.textMuted,
    margin: 0,
  },
  title: {
    fontSize: "2rem",
    margin: 0,
  },
  date: {
    display: "block",
    fontSize: "0.9rem",
    color: tokens.textMuted,
  },
});
