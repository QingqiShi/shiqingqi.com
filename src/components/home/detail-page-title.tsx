import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

interface PageTitleProps {
  type: "experience" | "education";
  title: string;
  role: string;
  date: string;
  /** ISO start date for the `<time dateTime>` attribute (e.g. "2021-08"). */
  dateTime: string;
}

export function DetailPageTitle({
  date,
  dateTime,
  role,
  title,
  type,
}: PageTitleProps) {
  const typeLabel =
    type === "experience"
      ? t({ en: "Experience", zh: "工作" })
      : t({ en: "Education", zh: "学习" });

  return (
    // DOM order is h1 → h2 → time so screen-reader heading navigation lands
    // on the page's primary heading first (WCAG 1.3.1 / 2.4.6). Flexbox
    // `order` restores the visual layout: kicker on top, role in the middle,
    // date at the bottom.
    <header css={[flex.col, styles.container]}>
      <h1 css={styles.title}>{role}</h1>
      <h2 css={styles.subtitle}>
        {typeLabel} - {title}
      </h2>
      <time dateTime={dateTime} css={styles.date}>
        {date}
      </time>
    </header>
  );
}

const styles = stylex.create({
  container: {
    gap: space._1,
    paddingBottom: space._8,
  },
  subtitle: {
    order: 0,
    fontSize: font.vpHeading3,
    fontWeight: font.weight_7,
    color: color.textMuted,
    margin: 0,
  },
  title: {
    order: 1,
    fontSize: font.vpHeading1,
    margin: 0,
  },
  date: {
    order: 2,
    display: "block",
    fontSize: font.uiBody,
    color: color.textMuted,
  },
});
