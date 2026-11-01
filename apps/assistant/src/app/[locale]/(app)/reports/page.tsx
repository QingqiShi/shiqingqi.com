import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { listReports } from "#src/assistant/report/read-report.ts";
import { formatDay } from "#src/assistant/report-page/format-day.ts";
import { Link } from "#src/links/link.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Past reports", zh: "往期晨报" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/reports");
  const reports = await withUser(getAssistantDb(), session.userId, listReports);
  const noMail = t({ en: "No new mail", zh: "没有新邮件" });
  const notWritten = t({ en: "Not written", zh: "没能写成" });

  return (
    <div css={stack.group}>
      <Heading level={1} look="h1">
        {t({ en: "Past reports", zh: "往期晨报" })}
      </Heading>
      {reports.length === 0 ? (
        <Text as="p" tone="muted">
          {t({
            en: "Past reports are listed once the first one is written.",
            zh: "第一份晨报写好后，往期晨报会显示在这里。",
          })}
        </Text>
      ) : (
        <ol css={[stack.rows, styles.list]}>
          {reports.map((report) => (
            <li key={report.localDate} css={styles.row}>
              <Link
                href={getLocalePath(`/reports/${report.localDate}`, locale)}
                {...stylex.props(a11y.focusRing, a11y.touchRow, styles.link)}
              >
                <span css={[typeRole.label, styles.day]}>
                  {formatDay(report.localDate, locale)}
                </span>
                <span css={[typeRole.bodySmall, styles.headline]}>
                  {report.headline ??
                    (report.status === "no-mail" ? noMail : notWritten)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const styles = stylex.create({
  list: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  row: {
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  link: {
    display: "flex",
    flexDirection: "column",
    paddingBlock: space._3,
    color: color.fg,
    textDecoration: "none",
  },
  day: {
    color: color.fg,
  },
  headline: {
    color: color.fgMuted,
  },
});
