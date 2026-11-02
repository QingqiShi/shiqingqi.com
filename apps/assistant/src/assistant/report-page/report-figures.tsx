import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { Link } from "#src/links/link.tsx";
import type { ReportView } from "../report/read-report.ts";
import { formatWeekday } from "./format-day.ts";

/** The counts of a report, each above zero: a large figure, then its muted label. */
export function ReportFigures({
  report,
  openTodos,
  locale,
}: {
  report: ReportView;
  /** Every open to-do of the user, of any report. */
  openTodos: number;
  locale: SupportedLocale;
}) {
  const mailDay = formatWeekday(report.content.mailDate, locale);
  const { mailCount } = report.content;
  const agendaCount = report.agenda?.length ?? 0;
  const figures = [
    {
      key: "needs-you",
      count: report.needsAction.length,
      label:
        report.needsAction.length === 1
          ? t({ en: "needs you", zh: "需要处理" })
          : t({ en: "need you", zh: "需要处理" }),
    },
    {
      key: "open-todos",
      count: openTodos,
      label:
        openTodos === 1
          ? t({ en: "open to-do", zh: "未完成待办" })
          : t({ en: "open to-dos", zh: "未完成待办" }),
      href: getLocalePath("/todos", locale),
    },
    {
      key: "agenda",
      count: agendaCount,
      label:
        agendaCount === 1
          ? t({ en: "event today", zh: "今日日程" })
          : t({ en: "events today", zh: "今日日程" }),
    },
    {
      key: "mail",
      count: mailCount,
      label: (mailCount === 1
        ? t({ en: "mail on {day}", zh: "封{day}的邮件" })
        : t({ en: "mails on {day}", zh: "封{day}的邮件" })
      ).replace("{day}", mailDay),
    },
  ].filter((figure) => figure.count > 0);
  if (figures.length === 0) return null;

  return (
    <dl css={[cluster.item, styles.figures]}>
      {figures.map(({ key, count, label, href }) => (
        <div key={key} css={[typeRole.bodySmall, styles.figure]}>
          <dt css={styles.label}>
            {href ? (
              <Link href={href} {...stylex.props(a11y.focusRing, styles.link)}>
                {label}
              </Link>
            ) : (
              label
            )}
          </dt>
          <dd css={[typeRole.h3, typeModifier.numeric, styles.count]}>
            {count}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const styles = stylex.create({
  figures: {
    margin: 0,
    rowGap: rhythm.inline,
  },
  figure: {
    position: "relative",
    display: "flex",
    alignItems: "baseline",
    gap: rhythm.inline,
  },
  label: {
    color: color.fgMuted,
  },
  count: {
    margin: 0,
    order: -1,
    fontWeight: font.weight_7,
  },
  // The link takes the whole figure, and 44px of height at the least.
  link: {
    color: {
      default: "inherit",
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    textDecorationLine: "underline",
    textDecorationColor: color.border,
    textUnderlineOffset: "0.2em",
    "::after": {
      content: '""',
      position: "absolute",
      inset: "min(0px, calc(50% - 22px))",
    },
  },
});
