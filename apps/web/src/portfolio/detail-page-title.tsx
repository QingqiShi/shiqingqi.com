import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

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
    <header css={[stack.tight, styles.container]}>
      <h1 css={[typeRole.fluidH1, styles.title]}>{role}</h1>
      <h2 css={[typeRole.fluidH3, styles.subtitle]}>
        {typeLabel} - {title}
      </h2>
      <time dateTime={dateTime} css={[typeRole.body, styles.date]}>
        {date}
      </time>
    </header>
  );
}

const styles = stylex.create({
  container: {
    paddingBottom: space._8,
  },
  subtitle: {
    order: 0,
    color: color.fgMuted,
    margin: 0,
  },
  title: {
    order: 1,
    margin: 0,
  },
  date: {
    order: 2,
    display: "block",
    color: color.fgMuted,
  },
});
