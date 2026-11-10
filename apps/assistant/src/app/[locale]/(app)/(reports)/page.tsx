import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import {
  askedHomeView,
  chooseHomeView,
  homeViewHref,
} from "#src/assistant/home/choose-home-view.ts";
import { readHomeStatusAndSettings } from "#src/assistant/home/read-home-status.ts";
import { HomeReport } from "#src/assistant/home-page/home-report.tsx";
import { HomeStatusProvider } from "#src/assistant/home-page/home-status-provider.tsx";
import { TodayView } from "#src/assistant/home-page/today-view.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Today", zh: "今天" }) };
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const now = new Date();
  const { status, settings } = await readHomeStatusAndSettings(scope, now);
  const asked = (await searchParams).view;
  const view = chooseHomeView(status, asked);
  // The visit marks the report seen. The address names the view, so that a
  // refresh or a back link after that shows the same view.
  if (askedHomeView(asked) === null) redirect(homeViewHref(view, locale));
  const reportRunning = status.run?.task === "report";
  return (
    <div css={stack.group}>
      <HomeStatusProvider seed={status} view={view}>
        {view === "report" ? (
          <HomeReport
            scope={scope}
            locale={locale}
            now={now}
            settings={settings}
            reportRunning={reportRunning}
          />
        ) : (
          <TodayView
            scope={scope}
            locale={locale}
            now={now}
            settings={settings}
            reportRunning={reportRunning}
          />
        )}
      </HomeStatusProvider>
    </div>
  );
}
