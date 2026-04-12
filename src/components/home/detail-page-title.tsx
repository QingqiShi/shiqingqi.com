import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

interface PageTitleProps {
  type: "experience" | "education";
  title: string;
  role: string;
  date: string;
}

export function DetailPageTitle({ date, role, title, type }: PageTitleProps) {
  const typeLabel =
    type === "experience"
      ? t({ en: "Experience", zh: "工作" })
      : t({ en: "Education", zh: "学习" });

  return (
    <header css={[flex.col, styles.container]}>
      <h1 css={styles.subtitle}>
        {typeLabel} - {title}
      </h1>
      <h2 css={styles.title}>{role}</h2>
      <time css={styles.date}>{date}</time>
    </header>
  );
}

const styles = stylex.create({
  container: {
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
