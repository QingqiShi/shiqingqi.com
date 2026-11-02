import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { chooseHomeView } from "#src/assistant/home/choose-home-view.ts";
import { readHomeStatusAndSettings } from "#src/assistant/home/read-home-status.ts";
import { HomeReport } from "#src/assistant/home-page/home-report.tsx";
import { HomeStatusCard } from "#src/assistant/home-page/home-status-card.tsx";
import { TodayView } from "#src/assistant/home-page/today-view.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Today", zh: "今天" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const now = new Date();
  const { status, settings } = await readHomeStatusAndSettings(scope, now);
  const view = chooseHomeView(status);
  return (
    <div css={stack.group}>
      <HomeStatusCard seed={status} view={view} />
      {view === "report" ? (
        <HomeReport
          scope={scope}
          locale={locale}
          now={now}
          settings={settings}
        />
      ) : (
        <TodayView
          scope={scope}
          locale={locale}
          now={now}
          settings={settings}
        />
      )}
    </div>
  );
}
