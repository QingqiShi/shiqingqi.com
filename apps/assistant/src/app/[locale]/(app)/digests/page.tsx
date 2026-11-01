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
import { listDigests } from "#src/assistant/digest/read-digest.ts";
import { formatDigestDay } from "#src/assistant/digest-page/format-digest-day.ts";
import { Link } from "#src/links/link.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Past digests", zh: "往期摘要" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/digests");
  const digests = await withUser(getAssistantDb(), session.userId, listDigests);
  const toAct = t({ en: "{count} to act", zh: "{count} 件待处理" });
  const quiet = t({ en: "A quiet day", zh: "平静的一天" });

  return (
    <div css={stack.group}>
      <Heading level={1} look="h1">
        {t({ en: "Past digests", zh: "往期摘要" })}
      </Heading>
      {digests.length === 0 ? (
        <Text as="p" tone="muted">
          {t({
            en: "Past digests are listed once the first one is built.",
            zh: "第一份摘要生成后，往期摘要会显示在这里。",
          })}
        </Text>
      ) : (
        <ol css={[stack.rows, styles.list]}>
          {digests.map((digest) => (
            <li key={digest.localDate} css={styles.row}>
              <Link
                href={getLocalePath(`/digests/${digest.localDate}`, locale)}
                {...stylex.props(a11y.focusRing, a11y.touchRow, styles.link)}
              >
                <span css={[typeRole.label, styles.day]}>
                  {formatDigestDay(digest.localDate, locale)}
                </span>
                <span css={[typeRole.bodySmall, styles.headline]}>
                  {digest.headline ??
                    (digest.counts.act > 0
                      ? toAct.replace("{count}", String(digest.counts.act))
                      : quiet)}
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
