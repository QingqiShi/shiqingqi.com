import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { color } from "@tuja/ui/color.stylex";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Anchor } from "#src/links/anchor.tsx";
import { ReconnectCallout } from "../home-page/reconnect-callout.tsx";
import type { MailboxHealth } from "../mailboxes/read-mailbox-health.ts";
import type {
  ReportItemView,
  ReportView as Report,
} from "../report/read-report.ts";
import { AgendaList } from "./agenda-list.tsx";
import { DayHead } from "./day-head.tsx";
import { formatDay } from "./format-day.ts";
import { OpenMailLink } from "./open-mail-button.tsx";
import { ReportCard } from "./report-card.tsx";
import { reportColumns } from "./report-columns.stylex.ts";
import { ReportFigures } from "./report-figures.tsx";
import { ReportTodoSection } from "./report-todo-section.tsx";
import { toTodoItemData, type TodoItemData } from "./to-todo-item-data.ts";
import { TodoItem } from "./todo-item.tsx";
import { TodoStoreProvider } from "./todo-store-provider.tsx";

function ItemLine({
  item,
  besideTodos = false,
}: {
  item: ReportItemView;
  /** Mark the line where the to-dos beside it have their box, so its text starts where their titles do. */
  besideTodos?: boolean;
}) {
  return (
    <li css={listSurface.item}>
      <div css={[listSurface.row, styles.line]}>
        {besideTodos ? (
          <span aria-hidden css={styles.mark}>
            <EnvelopeSimpleIcon weight="regular" />
          </span>
        ) : null}
        <div css={[stack.text, styles.lineText]}>
          <Text as="p">{item.text}</Text>
          {item.openHref ? (
            <div css={[cluster.inline, styles.meta]}>
              <OpenMailLink href={item.openHref} />
            </div>
          ) : null}
        </div>
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
  const besideTodos = items.some((item) => item.todo);
  return (
    <List form="plain">
      {items.map((item, index) =>
        item.todo ? (
          <TodoItem
            key={item.todo.id}
            id={item.todo.id}
            fallback={<ItemLine item={item} besideTodos />}
          />
        ) : (
          <ItemLine key={index} item={item} besideTodos={besideTodos} />
        ),
      )}
    </List>
  );
}

/** Lines that ask nothing of the owner, each marked as mail. */
function NoteList({ items }: { items: readonly ReportItemView[] }) {
  return (
    <List form="plain">
      {items.map((item, index) => (
        <ListRow
          key={index}
          wrap
          leading={<EnvelopeSimpleIcon weight="bold" />}
          leadingShape="circle"
          leadingSize="sm"
          extra={item.openHref ? <OpenMailLink href={item.openHref} /> : null}
        >
          {item.text}
        </ListRow>
      ))}
    </List>
  );
}

/** Every to-do that the page shows, each once. */
function todosOnPage(report: Report): TodoItemData[] {
  const rows = new Map<string, TodoItemData>();
  for (const { todo, openHref } of report.needsAction) {
    if (todo) rows.set(todo.id, toTodoItemData(todo, openHref));
  }
  for (const todo of [
    ...report.todos,
    ...report.doneTodos,
    ...report.keptOpenTodos,
    ...report.waitingTodos,
    ...report.repliedTodos,
  ]) {
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
  coveredMailboxes,
}: {
  report: Report;
  locale: SupportedLocale;
  /** Mailboxes that a callout above already asks to connect again, which the note on missing mail leaves out. */
  coveredMailboxes: readonly string[];
}) {
  const { content } = report;
  const unreadMailboxes = content.unreadMailboxes.filter(
    (box) => !coveredMailboxes.includes(box.address),
  );
  const notes: string[] = [];
  if (content.status === "no-model" || content.status === "failed") {
    notes.push(
      t({
        en: "The assistant read the mail but could not reach the model that writes the report. Tomorrow’s report tries again.",
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
      {unreadMailboxes.length > 0 ? (
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
            unreadMailboxes.map((box) => box.address).join(", "),
          )}{" "}
          <Anchor href={getLocalePath("/settings/mailboxes", locale)}>
            {t({ en: "Check your mailboxes", zh: "检查邮箱" })}
          </Anchor>
        </Callout>
      ) : null}
      {content.version === 2 && content.calendarUnread ? (
        <Callout intent="warning">
          {t({
            en: "Today’s calendar could not be read.",
            zh: "今天的日程没有读到。",
          })}
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
 * line with a to-do shows as that to-do), its other open to-dos, today's
 * agenda, what is worth knowing, what the report closed and a line on the
 * rest. In a wide container, what asks something of the owner takes one
 * column, with what the report closed at its foot, and the rest the other.
 * In a narrow one, the second column follows the first, and what the report
 * closed comes just above the rest.
 */
export function ReportView({
  report,
  today,
  timeZone,
  openTodos,
  locale,
  dateLocale,
  headingLevel,
  pastLink = false,
  renderedAt,
  refreshesOnLeave,
  hasCalendar,
  preview = false,
  status,
  note,
  mailboxHealth,
  controls,
}: {
  report: Report;
  /** The user's local date, for the due dates. */
  today: string;
  /** The owner's time zone. */
  timeZone: string;
  /** Every open to-do of the user, of any report, when the page loaded. */
  openTodos: number;
  locale: SupportedLocale;
  /** The locale the page writes dates in. */
  dateLocale: string;
  headingLevel: 1 | 2;
  /** Whether the report shows the way to the list of reports, where the list does not show beside it. */
  pastLink?: boolean;
  /** When the server began this render, in milliseconds. */
  renderedAt: number;
  /** See `TodoStoreProvider`. */
  refreshesOnLeave?: boolean;
  /** See `TodoStoreProvider`. */
  hasCalendar?: boolean;
  /** The report is a preview, whose changes to the to-dos have not happened. */
  preview?: boolean;
  /** See `DayHead`. */
  status?: ReactNode;
  /** See `DayHead`. */
  note?: ReactNode;
  /** Its mailboxes to connect again get a callout above the report's own notes, which then leave them out. */
  mailboxHealth?: MailboxHealth;
  /** See `DayHead`. */
  controls?: ReactNode;
}) {
  const { content } = report;
  const sectionLevel = headingLevel === 1 ? 2 : 3;
  const ownTodos = report.todos.filter((todo) => todo.doneAt === null);
  const idsOf = (list: readonly { id: string }[]) =>
    list.map((todo) => todo.id);

  const asks = [
    report.needsAction.length > 0 ? (
      <ReportCard
        key="needs"
        headingLevel={sectionLevel}
        title={t({ en: "Needs you", zh: "需要你处理" })}
      >
        <ItemList items={report.needsAction} />
      </ReportCard>
    ) : null,
    report.repliedTodos.length > 0 ? (
      <ReportTodoSection
        key="replied"
        headingLevel={sectionLevel}
        title={t({ en: "The reply came", zh: "回复到了" })}
        ids={idsOf(report.repliedTodos)}
      />
    ) : null,
    ownTodos.length > 0 ? (
      <ReportTodoSection
        key="todos"
        headingLevel={sectionLevel}
        title={t({ en: "To-dos", zh: "待办" })}
        ids={idsOf(ownTodos)}
      />
    ) : null,
    report.waitingTodos.length > 0 ? (
      <ReportTodoSection
        key="waiting"
        headingLevel={sectionLevel}
        title={t({ en: "Waiting on others", zh: "在等别人" })}
        ids={idsOf(report.waitingTodos)}
      />
    ) : null,
  ].filter((section) => section !== null);
  const tells = [
    report.agenda && report.agenda.length > 0 ? (
      <ReportCard
        key="agenda"
        headingLevel={sectionLevel}
        title={t({ en: "Calendar", zh: "日程" })}
      >
        <AgendaList items={report.agenda} form="plain" />
      </ReportCard>
    ) : null,
    report.worthKnowing.length > 0 ? (
      <ReportCard
        key="worth-knowing"
        headingLevel={sectionLevel}
        title={t({ en: "Good to know", zh: "知道就好" })}
      >
        <NoteList items={report.worthKnowing} />
      </ReportCard>
    ) : null,
  ].filter((section) => section !== null);
  const keptOpen =
    report.keptOpenTodos.length > 0 ? (
      <ReportTodoSection
        headingLevel={sectionLevel}
        title={t({
          en: "Still open: the mail says done, but the calendar did not free its time",
          zh: "仍未关闭：邮件显示已办完，但日历没能释放占用的时间",
        })}
        ids={idsOf(report.keptOpenTodos)}
      />
    ) : null;
  const done =
    report.doneTodos.length > 0 ? (
      <ReportTodoSection
        headingLevel={sectionLevel}
        title={
          preview
            ? t({ en: "Would close", zh: "将会关闭" })
            : t({ en: "Already done", zh: "已经办完" })
        }
        ids={idsOf(report.doneTodos)}
      />
    ) : null;
  const rest = content.rest ? (
    <ReportCard
      headingLevel={sectionLevel}
      title={t({ en: "The rest", zh: "其他" })}
    >
      <Text as="p" look="bodySmall" tone="muted">
        {content.rest}
      </Text>
    </ReportCard>
  ) : null;
  const hasAsks = asks.length > 0 || keptOpen !== null;
  const hasTells = tells.length > 0 || rest !== null;

  return (
    <TodoStoreProvider
      todos={todosOnPage(report)}
      today={today}
      timeZone={timeZone}
      openCount={openTodos}
      renderedAt={renderedAt}
      refreshesOnLeave={refreshesOnLeave}
      hasCalendar={hasCalendar}
    >
      <article css={[stack.group, styles.report, typeModifier.verbatim]}>
        <header css={stack.item}>
          <DayHead
            date={formatDay(report.localDate, dateLocale)}
            locale={locale}
            pastLink={pastLink}
            status={status}
            note={note}
            controls={controls}
          >
            <Heading level={headingLevel} look="h1">
              {headlineOf(report)}
            </Heading>
          </DayHead>
          <ReportFigures
            needsYou={report.needsAction.length}
            agendaCount={report.agenda?.length ?? 0}
            agendaDate={report.localDate}
            mailCount={content.mailCount}
            mailDate={content.mailDate}
            locale={locale}
          />
        </header>
        {mailboxHealth ? <ReconnectCallout health={mailboxHealth} /> : null}
        <Notes
          report={report}
          locale={locale}
          coveredMailboxes={
            mailboxHealth?.reconnect.map(({ address }) => address) ?? []
          }
        />
        {hasAsks && hasTells ? (
          <div css={[reportColumns.base, styles.columns]}>
            <div css={styles.column}>
              {asks}
              {done ? <div css={reportColumns.onlyWide}>{done}</div> : null}
              {keptOpen}
            </div>
            <div css={styles.column}>
              {tells}
              {done ? <div css={reportColumns.onlyNarrow}>{done}</div> : null}
              {rest}
            </div>
          </div>
        ) : (
          <div css={styles.column}>
            {asks}
            {keptOpen}
            {tells}
            {done}
            {rest}
          </div>
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
    alignItems: "flex-start",
    paddingBlock: space._2,
  },
  mark: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
    fontSize: controlSize._5,
    color: color.mutedForeground,
  },
  lineText: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  meta: {
    marginBlockStart: rhythm.inline,
  },
});
