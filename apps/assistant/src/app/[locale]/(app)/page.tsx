import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  listDraftRules,
  readDigest,
} from "#src/assistant/digest/read-digest.ts";
import { DigestView } from "#src/assistant/digest-page/digest-view.tsx";
import { AnchorButton } from "#src/links/anchor-button.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Digest", zh: "摘要" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/");
  const { accounts, digest, rules } = await withUser(
    getAssistantDb(),
    session.userId,
    async (scope) => ({
      accounts: await scope.db.$count(mailAccounts),
      digest: await readDigest(scope, null),
      rules: await listDraftRules(scope),
    }),
  );
  if (digest) {
    return <DigestView digest={digest} rules={rules} locale={locale} />;
  }

  return (
    <div css={stack.group}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Nothing to read yet", zh: "暂时没有需要看的" })}
        </Heading>
        <Text as="p" tone="muted">
          {accounts === 0
            ? t({
                en: "Your morning digest shows on this page once you connect a mailbox.",
                zh: "连接邮箱后，每天早上的摘要会显示在这里。",
              })
            : t({
                en: "Your mailboxes are connected. The first digest comes at your digest hour; until then, choose your categories so that mail can be filed.",
                zh: "邮箱已连接。第一份摘要会在你设定的时间送到；在此之前，请选择分类，以便归档邮件。",
              })}
        </Text>
      </div>
      <div css={cluster.tight}>
        <AnchorButton
          href={getLocalePath("/accounts", locale)}
          look={accounts === 0 ? "primary" : "outline"}
        >
          {accounts === 0
            ? t({ en: "Connect a mailbox", zh: "连接邮箱" })
            : t({ en: "Mailboxes", zh: "邮箱" })}
        </AnchorButton>
        {accounts > 0 ? (
          <AnchorButton
            href={getLocalePath("/categories", locale)}
            look="outline"
          >
            {t({ en: "Categories", zh: "分类" })}
          </AnchorButton>
        ) : null}
      </div>
    </div>
  );
}
