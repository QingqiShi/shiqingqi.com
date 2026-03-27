import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { gap, m } from "#src/primitives/spacing.stylex.ts";
import { text, textColor, weight } from "#src/primitives/text.stylex.ts";
import { space } from "#src/tokens.stylex.ts";

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
    <header css={[flex.col, gap._1, styles.container]}>
      <h2 css={[text.heading3, weight._7, textColor.muted, m._none]}>
        {typeLabel} - {title}
      </h2>
      <h1 css={[text.heading1, m._none]}>{role}</h1>
      <time css={[text.body, textColor.muted, styles.date]}>{date}</time>
    </header>
  );
}

const styles = stylex.create({
  container: {
    paddingBottom: space._8,
  },
  date: {
    display: "block",
  },
});
