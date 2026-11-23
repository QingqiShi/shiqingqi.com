import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { NotebookIcon } from "@phosphor-icons/react/dist/ssr/Notebook";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { Columns } from "@tuja/ui/components/columns";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Section } from "@tuja/ui/components/section";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/auth/require-page-session.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { getInstruments } from "#src/fund/market/get-instruments.ts";
import { JournalEntries } from "#src/fund/ui/journal-entries.tsx";
import { MeetingList } from "#src/fund/ui/meeting-list.tsx";
import { loadJournal } from "#src/fund/views/load-journal.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Journal", zh: "日志" }) };
}

interface JournalPageProps extends PageProps {
  searchParams: Promise<{ before?: string | string[] }>;
}

export default async function Page({ params, searchParams }: JournalPageProps) {
  const locale = validateLocale((await params).locale);
  await requirePageSession(locale, "/journal");
  const { before } = await searchParams;
  const db = getFundDb();
  const view = await loadJournal(
    db,
    await getInstruments(db),
    typeof before === "string" ? before : undefined,
  );
  const journalPath = getLocalePath("/journal", locale);

  return (
    <NavigationStack
      label={t({ en: "Journal", zh: "日志" })}
      css={pageColumn.report}
    >
      <PageHeader
        size="sm"
        title={t({ en: "Journal", zh: "日志" })}
        description={t({
          en: "What the fund did and why, day by day, and the minutes of every meeting.",
          zh: "基金每天做了什么、为什么这样做，以及每次会议的纪要。",
        })}
      />
      <Columns ratio="2:1">
        <Section
          level={2}
          look="heading"
          title={t({ en: "Entries", zh: "记录" })}
        >
          {view.entries.length === 0 ? (
            <EmptyState
              level={3}
              icon={<NotebookIcon weight="bold" />}
              title={t({ en: "No entries yet", zh: "还没有记录" })}
              description={t({
                en: "Each meeting writes down what it decided and why: every order, every hold, every order turned down.",
                zh: "每次会议都会记下它的决定和理由：每笔订单、每次持有、每笔被否决的订单。",
              })}
            />
          ) : (
            <JournalEntries entries={view.entries} />
          )}
        </Section>
        <Section
          level={2}
          look="heading"
          title={t({ en: "Meetings", zh: "会议" })}
          description={
            view.runs.length === 0
              ? undefined
              : t({
                  en: "Each opens its minutes. The figure is what its models cost.",
                  zh: "点开查看会议纪要。金额是模型调用的费用。",
                })
          }
        >
          {view.runs.length === 0 ? (
            <EmptyState
              level={3}
              icon={<UsersThreeIcon weight="bold" />}
              title={t({ en: "No meetings yet", zh: "还没有开过会" })}
              description={t({
                en: "Start the strategy session on the Desk.",
                zh: "请在交易台召开策略会议。",
              })}
            />
          ) : (
            <MeetingList runs={view.runs} locale={locale} />
          )}
        </Section>
      </Columns>
      {view.before === null && view.earlier === null ? null : (
        <div css={cluster.item}>
          {view.earlier === null ? null : (
            <Button
              href={`${journalPath}?before=${view.earlier}`}
              look="outline"
              size="sm"
              icon={<ClockCounterClockwiseIcon weight="bold" />}
            >
              {t({ en: "Earlier", zh: "更早" })}
            </Button>
          )}
          {view.before === null ? null : (
            <Button
              href={journalPath}
              look="ghost"
              size="sm"
              icon={<ArrowUpIcon weight="bold" />}
            >
              {t({ en: "Newest", zh: "最新" })}
            </Button>
          )}
        </div>
      )}
    </NavigationStack>
  );
}
