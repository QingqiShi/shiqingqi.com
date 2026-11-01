import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { CategorySetupForm } from "#src/assistant/categories/category-setup-form.tsx";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { listCategorySetup } from "#src/assistant/mail/categories/list-category-setup.ts";
import { Anchor } from "#src/links/anchor.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Categories", zh: "分类" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/categories");
  const accounts = await withUser(
    getAssistantDb(),
    session.userId,
    listCategorySetup,
  );

  return (
    <div css={stack.section}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Categories", zh: "分类" })}
        </Heading>
        <Text as="p" tone="muted">
          {t({
            en: "Mark the folders that mail should be filed into, and name each category. Give folders in different mailboxes the same name to make them one category.",
            zh: "标记邮件应归入的文件夹，并为每个分类命名。不同邮箱里的文件夹用同一个名称，就会合并为同一个分类。",
          })}
        </Text>
      </div>
      {accounts.length === 0 ? (
        <Text as="p">
          <Anchor href={getLocalePath("/accounts", locale)}>
            {t({ en: "Connect a mailbox first", zh: "请先连接邮箱" })}
          </Anchor>
        </Text>
      ) : (
        <CategorySetupForm accounts={accounts} />
      )}
    </div>
  );
}
