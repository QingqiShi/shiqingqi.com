import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { getMailImageLinks } from "#src/assistant/mail/images/get-mail-image-links.ts";
import { messageIdOfSegment } from "#src/assistant/mail/view/mail-view-path.ts";
import { readMailView } from "#src/assistant/mail/view/read-mail-view.ts";
import { MailPageView } from "#src/assistant/mail-page/mail-page-view.tsx";
import { openMailHref } from "#src/assistant/report/open-mail-href.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { getDateLocale } from "#src/assistant/shell/get-date-locale.ts";

interface Props {
  params: Promise<{ locale: string; accountId: string; messageId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  validateLocale((await params).locale);
  return { title: t({ en: "Mail", zh: "邮件" }) };
}

export default async function Page({ params }: Props) {
  const { locale: rawLocale, accountId, messageId: segment } = await params;
  const locale = validateLocale(rawLocale);
  const session = await requirePageSession(
    locale,
    `/mail/${accountId}/${segment}`,
  );
  const messageId = messageIdOfSegment(segment);
  if (!z.uuid().safeParse(accountId).success || !messageId) notFound();
  const scope = { db: getAssistantDb(), userId: session.userId };
  const imageLinks = getMailImageLinks();
  const [result, settings] = await Promise.all([
    readMailView(scope, getMailDeps(), accountId, messageId, imageLinks),
    readReportSettings(scope),
  ]);
  if (!result) notFound();
  return (
    <MailPageView
      result={result}
      openHref={openMailHref({
        provider: result.account.provider,
        accountAddress: result.account.address,
        messageId,
      })}
      dateLocale={await getDateLocale(locale)}
      timeZone={settings.timeZone}
    />
  );
}
