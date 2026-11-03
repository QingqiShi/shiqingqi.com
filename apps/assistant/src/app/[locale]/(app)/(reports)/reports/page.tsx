import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { LatestReport } from "#src/assistant/report-page/latest-report.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Past reports", zh: "往期晨报" }) };
}

/** The list is in the layout. This is the column beside it, where both fit. */
export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/reports");
  return (
    <LatestReport
      scope={{ db: getAssistantDb(), userId: session.userId }}
      locale={locale}
      headingLevel={2}
    />
  );
}
