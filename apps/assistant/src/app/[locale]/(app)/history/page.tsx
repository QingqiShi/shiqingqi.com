import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { mailCategories } from "#src/assistant/db/schema.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { readHistoryProgress } from "#src/assistant/history/read-history-progress.ts";
import { searchMail } from "#src/assistant/history/search-mail.ts";
import { FolderTable } from "#src/assistant/history-page/folder-table.tsx";
import { HistoryToggle } from "#src/assistant/history-page/history-toggle.tsx";
import { MailSearch } from "#src/assistant/history-page/mail-search.tsx";
import { PROVIDER_NAMES } from "#src/assistant/mailboxes/provider-names.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { Anchor } from "#src/links/anchor.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Old mail", zh: "旧邮件" }) };
}

function firstOf(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/history");
  const search = await searchParams;
  const query = firstOf(search.q).slice(0, 200);
  const category = firstOf(search.category);
  const categoryId = UUID.test(category) ? category : null;
  const searched = query.trim() !== "" || categoryId !== null;
  const { progress, settings, categories, results } = await withUser(
    getAssistantDb(),
    session.userId,
    async (scope) => ({
      progress: await readHistoryProgress(scope),
      settings: await readReportSettings(scope),
      categories: await scope.db
        .select({ id: mailCategories.id, name: mailCategories.name })
        .from(mailCategories)
        .orderBy(asc(mailCategories.name)),
      results: searched ? await searchMail(scope, { query, categoryId }) : [],
    }),
  );
  const numbers = new Intl.NumberFormat(locale);
  const formatNumber = (value: number) => numbers.format(value);
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: settings.timeZone,
  });
  const formatDate = (date: Date) => dates.format(date);
  const estimate =
    progress.mailsToClassify > 0
      ? t({
          en: "About {count} old mails are left for the assistant to sort. That costs about {cost} in model fees.",
          zh: "还有约 {count} 封旧邮件要由助手分拣，模型费用约 {cost}。",
        })
          .replace("{count}", formatNumber(progress.mailsToClassify))
          .replace("{cost}", money.format(Math.max(progress.estimate, 0.01)))
      : t({
          en: "No old mail is left for the assistant to sort.",
          zh: "没有剩下要由助手分拣的旧邮件。",
        });

  return (
    <div css={stack.section}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Old mail", zh: "旧邮件" })}
        </Heading>
        <Text as="p" tone="muted">
          {t({
            en: "The assistant reads only mail that arrives after you connect a mailbox. Import the older mail to search it, and to let the assistant learn who you write to. Old mail never shows in a digest, never gets marked, flagged or moved, and never becomes a calendar event.",
            zh: "助手只读取连接邮箱之后收到的邮件。导入更早的邮件后，你可以搜索它们，助手也能知道你和谁通信。旧邮件不会出现在摘要里，不会被标记、加旗标或移动，也不会生成日历安排。",
          })}
        </Text>
      </div>
      <Section level={2} divider title={t({ en: "Import", zh: "导入" })}>
        <div css={stack.item}>
          <HistoryToggle initial={progress.enabled} estimate={estimate} />
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "Set up your categories first: mail in a category folder is only stored, at no cost. The assistant sorts the rest (the inbox and the other folders) with the same rules as new mail, in batches that take up to a day. It works every 15 minutes and goes on where it stopped; pause it at any time. Starting it again also retries the mail that failed. Spent so far: {spent}.",
              zh: "请先设置分类：分类文件夹里的邮件只会被存储，没有费用。其余的邮件（收件箱和其他文件夹）由助手按和新邮件相同的规则分批分拣，每批最多需要一天。它每 15 分钟运行一次，从上次停下的地方继续；你可以随时暂停。重新开始时也会重试失败的邮件。目前已花费：{spent}。",
            }).replace("{spent}", money.format(progress.spent))}
          </Text>
          {progress.accounts.length === 0 ? (
            <Text as="p">
              <Anchor href={getLocalePath("/accounts", locale)}>
                {t({ en: "Connect a mailbox first", zh: "请先连接邮箱" })}
              </Anchor>
            </Text>
          ) : (
            <Text as="p">
              <Anchor href={getLocalePath("/categories", locale)}>
                {t({ en: "Set up categories", zh: "设置分类" })}
              </Anchor>
            </Text>
          )}
        </div>
      </Section>
      {progress.accounts.map((account) => (
        <Section
          key={account.id}
          level={2}
          divider
          title={account.address}
          description={PROVIDER_NAMES[account.provider]}
        >
          <FolderTable
            address={account.address}
            folders={account.folders}
            formatNumber={formatNumber}
          />
        </Section>
      ))}
      <Section level={2} divider title={t({ en: "Search", zh: "搜索" })}>
        <MailSearch
          query={query}
          categoryId={categoryId}
          categories={categories}
          results={results}
          searched={searched}
          formatDate={formatDate}
        />
      </Section>
    </div>
  );
}
