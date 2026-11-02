import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { safeNextPath } from "#src/assistant/auth/sign-in-path.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { ASSISTANT_PATH_HEADER } from "#src/assistant/http/constants.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { listReports } from "#src/assistant/report/read-report.ts";
import { ReportsFrame } from "#src/assistant/report-page/reports-frame.tsx";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = validateLocale((await params).locale);
  // A layout can render before the root layout sets the locale, so it sets it too.
  setLocale(locale);
  const session = await requirePageSession(
    locale,
    safeNextPath((await headers()).get(ASSISTANT_PATH_HEADER)),
  );
  const scope = { db: getAssistantDb(), userId: session.userId };
  const [reports, settings] = await Promise.all([
    listReports(scope),
    readReportSettings(scope),
  ]);
  return (
    <ReportsFrame
      reports={reports}
      today={localClock(new Date(), settings.timeZone).date}
    >
      {children}
    </ReportsFrame>
  );
}
