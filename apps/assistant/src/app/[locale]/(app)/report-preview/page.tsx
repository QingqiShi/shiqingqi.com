import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportPreview } from "#src/assistant/report/read-report-preview.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { ReportPreviewView } from "#src/assistant/report-preview-page/report-preview-view.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Morning report preview", zh: "晨报预览" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/report-preview");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const now = new Date();
  const [preview, settings] = await Promise.all([
    readReportPreview(scope, now),
    readReportSettings(scope),
  ]);
  return (
    <NavigationSplitView
      content={{
        label: t({ en: "Morning report preview", zh: "晨报预览" }),
        node: (
          <ReportPreviewView
            preview={preview}
            today={localClock(now, settings.timeZone).date}
            timeZone={settings.timeZone}
            locale={locale}
          />
        ),
      }}
    />
  );
}
