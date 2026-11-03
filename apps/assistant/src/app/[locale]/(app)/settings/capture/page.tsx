import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getRequestOrigin } from "#src/assistant/auth/get-request-origin.ts";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { captureTokenStore } from "#src/assistant/report/capture-token-store.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { CaptureSettings } from "#src/assistant/settings/capture-settings.tsx";
import { BASE_URL } from "#src/constants.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Add from your phone", zh: "从手机添加" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/settings/capture");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const [tokens, { timeZone }, requestHeaders] = await Promise.all([
    captureTokenStore.list(scope),
    readReportSettings(scope),
    headers(),
  ]);
  const origin = getRequestOrigin(
    new Request(BASE_URL, { headers: requestHeaders }),
  );

  return (
    <CaptureSettings
      tokens={tokens.map(({ id, createdAt, lastUsedAt }) => ({
        id,
        createdAt: createdAt.toISOString(),
        lastUsedAt: lastUsedAt?.toISOString() ?? null,
      }))}
      captureUrl={`${origin}/api/todos/capture`}
      today={localClock(new Date(), timeZone).date}
      timeZone={timeZone}
    />
  );
}
