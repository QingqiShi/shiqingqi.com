import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import type {
  ReportItemView,
  ReportView as Report,
} from "../report/read-report.ts";
import { AgendaList } from "./agenda-list.tsx";
import { formatDay } from "./format-day.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import { reportColumns } from "./report-columns.stylex.ts";
import { ReportFigures } from "./report-figures.tsx";
import { ReportPastLink } from "./report-past-link.tsx";
import { ReportSection } from "./report-section.tsx";
import { ReportTodoSection } from "./report-todo-section.tsx";
import { toTodoItemData, type TodoItemData } from "./to-todo-item-data.ts";
import { TodoItem } from "./todo-item.tsx";
import { TodoStoreProvider } from "./todo-store-provider.tsx";

function ItemLine({ item }: { item: ReportItemView }) {
  return (
    <li css={listSurface.item}>
      <div css={[listSurface.row, styles.line]}>
        <Text as="p" css={styles.lineText}>
          {item.text}
        </Text>
        {item.openHref ? <OpenMailButton href={item.openHref} /> : null}
      </div>
    </li>
  );
}

/**
 * The lines of a section. A line with a to-do shows as that to-do, with
 * a box to tick it off, so that the page says it once. Once the owner deletes
 * that to-do, the line shows its own words.
 */
function ItemList({ items }: { items: readonly ReportItemView[] }) {
  return (
    <List>
      {items.map((item, index) =>
        item.todo ? (
          <TodoItem
            key={item.todo.id}
            id={item.todo.id}
            fallback={<ItemLine item={item} />}
          />
        ) : (
          <ItemLine key={index} item={item} />
        ),
      )}
    </List>
  );
}

/** Every to-do that the page shows, each once. */
function todosOnPage(report: Report): TodoItemData[] {
  const rows = new Map<string, TodoItemData>();
  for (const { todo, openHref } of report.needsAction) {
    if (todo) rows.set(todo.id, toTodoItemData(todo, openHref));
  }
  for (const todo of [...report.todos, ...report.doneTodos]) {
    if (!rows.has(todo.id)) rows.set(todo.id, toTodoItemData(todo));
  }
  return [...rows.values()];
}

function headlineOf(report: Report) {
  const { content } = report;
  if (content.headline) return content.headline;
  if (content.status === "no-mail") {
    return t({ en: "No new mail yesterday.", zh: "昨天没有新邮件。" });
  }
  if (content.status === "written") {
    return t({ en: "Your morning report", zh: "今日晨报" });
  }
  return t({
    en: "The morning report could not be written today.",
    zh: "今天的晨报没能写成。",
  });
}

function Notes({
  report,
  locale,
}: {
  report: Report;
  locale: SupportedLocale;
}) {
  const { content } = report;
  const notes: string[] = [];
  if (content.status === "no-model" || content.status === "failed") {
    notes.push(
      t({
        en: "The assistant read the mail but could not reach the model that writes the report. Tomorrow's report tries again.",
        zh: "助手读取了邮件，但无法连接撰写晨报的模型。明天的晨报会再试一次。",
      }),
    );
  }
  if (content.version === 1 && content.leftOut > 0) {
    notes.push(
      t({
        en: "{count} mails were too many to include, mostly newsletters and notifications.",
        zh: "有 {count} 封邮件因数量太多未纳入，大多是订阅和通知。",
      }).replace("{count}", String(content.leftOut)),
    );
  }
  if (content.version === 1 && content.notRead > 0) {
    notes.push(
      t({
        en: "Up to {count} mails could not be read in time.",
        zh: "最多有 {count} 封邮件没能及时读取。",
      }).replace("{count}", String(content.notRead)),
    );
  } else if (content.ranOutOfTime) {
    notes.push(
      t({
        en: "The time ran out before all your mail was read.",
        zh: "时间不够，没能读完所有邮件。",
      }),
    );
  }
  return (
    <>
      {content.unreadMailboxes.length > 0 ? (
        <Callout
          intent="warning"
          title={t({
            en: "Some mail is missing",
            zh: "部分邮件没有读到",
          })}
        >
          {t({
            en: "These mailboxes could not be read: {addresses}. The first report that can read them will include their mail.",
            zh: "这些邮箱无法读取：{addresses}。下一份能读取它们的报告会补上这些邮件。",
          }).replace(
            "{addresses}",
            content.unreadMailboxes.map((box) => box.address).join(", "),
          )}{" "}
          <Anchor href={getLocalePath("/settings/mailboxes", locale)}>
            {t({ en: "Check your mailboxes", zh: "检查邮箱" })}
          </Anchor>
        </Callout>
      ) : null}
      {notes.map((note) => (
        <Text key={note} as="p" look="bodySmall" tone="muted">
          {note}
        </Text>
      ))}
    </>
  );
}

/**
 * One morning report: the headline and its counts, what needs the owner (a
 * line with a to-do shows as that to-do), its other to-dos, today's agenda,
 * what is worth knowing and a line on the rest. In a wide container, what
 * asks something of the owner takes one column and the rest the other.
 */
export function ReportView({
  report,
  today,
  timeZone,
  openTodos,
  locale,
  headingLevel,
  pastLink,
  renderedAt,
  refreshesOnLeave,
}: {
  report: Report;
  /** The user's local date, for the due dates. */
  today: string;
  /** The owner's time zone. */
  timeZone: string;
  /** Every open to-do of the user, of any report, when the page loaded. */
  openTodos: number;
  locale: SupportedLocale;
  headingLevel: 1 | 2;
  /** `back` where the list opened this report; null where no link to the list fits. */
  pastLink: "back" | "list" | null;
  /** When the server began this render, in milliseconds. */
  renderedAt: number;
  /** See `TodoStoreProvider`. */
  refreshesOnLeave?: boolean;
}) {
  const { content } = report;
  const sectionLevel = headingLevel === 1 ? 2 : 3;
  const ownTodos = report.todos.filter((todo) => todo.doneAt === null);
  const doneTitle = t({ en: "Done, says the mail", zh: "邮件显示已完成" });
  const idsOf = (list: readonly { id: string }[]) =>
    list.map((todo) => todo.id);

  const asks = [
    report.needsAction.length > 0 ? (
      <ReportSection
        key="needs"
        headingLevel={sectionLevel}
        title={t({ en: "Needs you", zh: "需要你处理" })}
      >
        <ItemList items={report.needsAction} />
      </ReportSection>
    ) : null,
    ownTodos.length > 0 ? (
      <ReportTodoSection
        key="todos"
        headingLevel={sectionLevel}
        title={t({ en: "To-dos", zh: "待办" })}
        ids={idsOf(ownTodos)}
      />
    ) : null,
    report.doneTodos.length > 0 ? (
      <ReportTodoSection
        key="done"
        headingLevel={sectionLevel}
        title={doneTitle}
        ids={idsOf(report.doneTodos)}
      />
    ) : null,
  ].filter((section) => section !== null);
  const tells = [
    report.agenda && report.agenda.length > 0 ? (
      <ReportSection
        key="agenda"
        headingLevel={sectionLevel}
        title={t({ en: "Today", zh: "今天的日程" })}
      >
        <AgendaList items={report.agenda} />
      </ReportSection>
    ) : null,
    report.worthKnowing.length > 0 ? (
      <ReportSection
        key="worth-knowing"
        headingLevel={sectionLevel}
        title={t({ en: "Good to know", zh: "知道就好" })}
      >
        <ItemList items={report.worthKnowing} />
      </ReportSection>
    ) : null,
    content.rest ? (
      <ReportSection
        key="rest"
        headingLevel={sectionLevel}
        title={t({ en: "The rest", zh: "其他" })}
      >
        <Text as="p" tone="muted">
          {content.rest}
        </Text>
      </ReportSection>
    ) : null,
  ].filter((section) => section !== null);

  return (
    <TodoStoreProvider
      todos={todosOnPage(report)}
      today={today}
      timeZone={timeZone}
      locale={locale}
      openCount={openTodos}
      renderedAt={renderedAt}
      refreshesOnLeave={refreshesOnLeave}
    >
      <article css={[stack.group, styles.report]}>
        <header css={stack.item}>
          {pastLink ? <ReportPastLink kind={pastLink} locale={locale} /> : null}
          <div css={stack.tight}>
            <Text look="overline" tone="muted">
              {formatDay(report.localDate, locale)}
            </Text>
            <Heading level={headingLevel} look="h2">
              {headlineOf(report)}
            </Heading>
          </div>
          <ReportFigures
            needsYou={report.needsAction.length}
            agendaCount={report.agenda?.length ?? 0}
            mailCount={content.mailCount}
            mailDate={content.mailDate}
            locale={locale}
          />
        </header>
        <Notes report={report} locale={locale} />
        {asks.length > 0 && tells.length > 0 ? (
          <div css={[reportColumns.base, styles.columns]}>
            <div css={styles.column}>{asks}</div>
            <div css={styles.column}>{tells}</div>
          </div>
        ) : (
          <div css={styles.column}>{asks.length > 0 ? asks : tells}</div>
        )}
      </article>
    </TodoStoreProvider>
  );
}

const styles = stylex.create({
  report: {
    containerType: "inline-size",
  },
  columns: {
    gap: rhythm.group,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.group,
    minInlineSize: 0,
  },
  line: {
    paddingBlock: space._2,
  },
  lineText: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
