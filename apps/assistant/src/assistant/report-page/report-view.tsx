import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import type {
  ReportItemView,
  ReportView as Report,
} from "../report/read-report.ts";
import { formatDay } from "./format-day.ts";
import { TodoList } from "./todo-list.tsx";

function ItemList({ items }: { items: readonly ReportItemView[] }) {
  const open = t({ en: "Open mail", zh: "打开原邮件" });
  return (
    <ul css={[stack.rows, styles.list]}>
      {items.map((item, index) => (
        <li key={index} css={styles.item}>
          <Text as="p">
            {item.text}
            {item.openHref ? (
              <>
                {" "}
                <Anchor
                  href={item.openHref}
                  {...(item.openHref.startsWith("https:")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {open}
                </Anchor>
              </>
            ) : null}
          </Text>
        </li>
      ))}
    </ul>
  );
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
  if (content.leftOut > 0) {
    notes.push(
      t({
        en: "{count} mails were too many to include, mostly newsletters and notifications.",
        zh: "有 {count} 封邮件因数量太多未纳入，大多是订阅和通知。",
      }).replace("{count}", String(content.leftOut)),
    );
  }
  if (content.notRead > 0) {
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
            en: "These mailboxes could not be read: {addresses}.",
            zh: "这些邮箱无法读取：{addresses}。",
          }).replace(
            "{addresses}",
            content.unreadMailboxes.map((box) => box.address).join(", "),
          )}{" "}
          <Anchor href={getLocalePath("/accounts", locale)}>
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

/** One morning report: the headline, what needs the owner, its to-dos, what is worth knowing and a line on the rest. */
export function ReportView({
  report,
  today,
  openTodos,
  locale,
}: {
  report: Report;
  /** The user's local date, for the due dates. */
  today: string;
  /** Every open to-do of the user, of any report. */
  openTodos: number;
  locale: SupportedLocale;
}) {
  const { content } = report;
  const ownTodos = report.todos.filter((todo) => todo.doneAt === null);
  const read =
    content.mailCount === 1
      ? t({ en: "From 1 mail on {day}.", zh: "根据{day}的 1 封邮件。" })
      : t({
          en: "From {count} mails on {day}.",
          zh: "根据{day}的 {count} 封邮件。",
        }).replace("{count}", String(content.mailCount));
  const mailDay = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${content.mailDate}T12:00:00Z`));

  return (
    <div css={stack.section}>
      <header css={stack.tight}>
        <Text look="overline" tone="muted">
          {formatDay(report.localDate, locale)}
        </Text>
        <Heading level={1} look="h2">
          {headlineOf(report)}
        </Heading>
        {content.mailCount > 0 ? (
          <Text as="p" tone="muted">
            {read.replace("{day}", mailDay)}
          </Text>
        ) : null}
      </header>
      <Notes report={report} locale={locale} />
      {report.needsAction.length > 0 ? (
        <Section level={2} title={t({ en: "Needs you", zh: "需要你处理" })}>
          <ItemList items={report.needsAction} />
        </Section>
      ) : null}
      {ownTodos.length > 0 || openTodos > 0 ? (
        <Section
          level={2}
          title={t({ en: "To-dos", zh: "待办" })}
          actions={
            openTodos > ownTodos.length ? (
              <Anchor href={getLocalePath("/todos", locale)}>
                {t({
                  en: "All open ({count})",
                  zh: "全部未完成（{count}）",
                }).replace("{count}", String(openTodos))}
              </Anchor>
            ) : null
          }
        >
          {ownTodos.length > 0 ? (
            <TodoList todos={ownTodos} today={today} locale={locale} />
          ) : (
            <Text as="p" tone="muted">
              {t({
                en: "No new to-dos from this mail.",
                zh: "这些邮件没有新的待办。",
              })}
            </Text>
          )}
        </Section>
      ) : null}
      {report.worthKnowing.length > 0 ? (
        <Section level={2} title={t({ en: "Good to know", zh: "知道就好" })}>
          <ItemList items={report.worthKnowing} />
        </Section>
      ) : null}
      {content.rest ? (
        <Section level={2} title={t({ en: "The rest", zh: "其他" })}>
          <Text as="p" tone="muted">
            {content.rest}
          </Text>
        </Section>
      ) : null}
      <Text as="p" look="bodySmall">
        <Anchor href={getLocalePath("/reports", locale)}>
          {t({ en: "Past reports", zh: "往期晨报" })}
        </Anchor>
      </Text>
    </div>
  );
}

const styles = stylex.create({
  list: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  item: {
    paddingBlock: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
});
