import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { RouterLink } from "@tuja/next-links/router-link";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Pager, type PagerPage } from "@tuja/ui/components/pager";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import {
  countOpenTodos,
  listDoneTodos,
} from "#src/assistant/report/read-report.ts";
import { DoneArchive } from "#src/assistant/report-page/done-archive.tsx";
import { toTodoItemData } from "#src/assistant/report-page/to-todo-item-data.ts";
import { TodoStoreProvider } from "#src/assistant/report-page/todo-store-provider.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Done to-dos", zh: "已完成的待办" }) };
}

function pageOf(value: string | string[] | undefined) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/todos/done");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const renderedAt = new Date().getTime();
  const [{ todos, page, pageCount }, settings, openCount] = await Promise.all([
    listDoneTodos(scope, pageOf((await searchParams).page)),
    readReportSettings(scope),
    countOpenTodos(scope),
  ]);
  const pageTitle = t({ en: "Page {page}", zh: "第 {page} 页" });
  const pagerPage = (label: string, number: number): PagerPage => ({
    href: `${getLocalePath("/todos/done", locale)}${number === 1 ? "" : `?page=${String(number)}`}`,
    label,
    title: pageTitle.replace("{page}", String(number)),
  });

  const title = t({ en: "Done", zh: "已完成" });

  return (
    <NavigationSplitView
      content={{
        label: title,
        node: (
          <div css={stack.group}>
            <header css={stack.tight}>
              <div>
                <Button
                  href={getLocalePath("/todos", locale)}
                  look="ghost"
                  size="sm"
                  icon={<ArrowLeftIcon weight="bold" />}
                >
                  {t({ en: "To-dos", zh: "待办" })}
                </Button>
              </div>
              <Heading level={1} look="h3">
                {title}
              </Heading>
            </header>
            <TodoStoreProvider
              todos={todos.map((todo) => toTodoItemData(todo))}
              today={localClock(new Date(), settings.timeZone).date}
              locale={locale}
              timeZone={settings.timeZone}
              openCount={openCount}
              renderedAt={renderedAt}
            >
              <DoneArchive />
            </TodoStoreProvider>
            <Pager
              aria-label={t({
                en: "Pages of done to-dos",
                zh: "已完成待办的页码",
              })}
              linkComponent={RouterLink}
              previous={
                page > 1
                  ? pagerPage(t({ en: "Newer", zh: "较新" }), page - 1)
                  : undefined
              }
              next={
                page < pageCount
                  ? pagerPage(t({ en: "Older", zh: "较早" }), page + 1)
                  : undefined
              }
            />
          </div>
        ),
      }}
    />
  );
}
