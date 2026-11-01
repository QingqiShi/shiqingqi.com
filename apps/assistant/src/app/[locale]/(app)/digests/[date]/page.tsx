import { t } from "@tuja/i18n";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  listDraftRules,
  readDigest,
} from "#src/assistant/digest/read-digest.ts";
import { DigestView } from "#src/assistant/digest-page/digest-view.tsx";
import { formatDigestDay } from "#src/assistant/digest-page/format-digest-day.ts";

interface Props {
  params: Promise<{ locale: string; date: string }>;
}

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, date } = await params;
  const valid: SupportedLocale = validateLocale(locale);
  return {
    title: LOCAL_DATE.test(date)
      ? formatDigestDay(date, valid)
      : t({ en: "Digest", zh: "摘要" }),
  };
}

export default async function Page({ params }: Props) {
  const { locale: rawLocale, date } = await params;
  const locale = validateLocale(rawLocale);
  if (!LOCAL_DATE.test(date)) notFound();
  const session = await requirePageSession(locale, `/digests/${date}`);
  const { digest, rules } = await withUser(
    getAssistantDb(),
    session.userId,
    async (scope) => ({
      digest: await readDigest(scope, date),
      rules: await listDraftRules(scope),
    }),
  );
  if (!digest) notFound();
  return <DigestView digest={digest} rules={rules} locale={locale} />;
}
