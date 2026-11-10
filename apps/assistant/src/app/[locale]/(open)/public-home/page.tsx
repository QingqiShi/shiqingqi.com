import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Heading } from "@tuja/ui/components/heading";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalSection } from "#src/assistant/legal/legal-page.tsx";
import { AssistantFrame } from "#src/assistant/shell/assistant-frame.tsx";
import { Anchor } from "#src/links/anchor.tsx";

export const metadata: Metadata = { robots: { index: true, follow: true } };

export default async function Page() {
  // The proxy chooses this page for one visitor at `/`, so no copy may be cached.
  await connection();
  const locale = getLocale();
  return (
    <AssistantFrame brand={t({ en: "Qi Assistant", zh: "Qi Assistant" })}>
      <article css={stack.group}>
        <div css={stack.tight}>
          <Heading level={1} look="h1">
            {t({
              en: "Your mail, filed and summed up each morning",
              zh: "邮件自动归档，每天早上一份晨报",
            })}
          </Heading>
          <Text>
            {t({
              en: "Qi Assistant (assistant.qingqi.dev) is a mail assistant that Qingqi Shi built and runs. It is designed for anyone to use, but it is not open for sign-up yet. It files the mail in an inbox into folders, and each morning it writes a report of the last 24 hours’ mail with the to-dos it finds.",
              zh: "Qi Assistant（assistant.qingqi.dev）是石清琪开发并运营的邮件助手，面向所有人设计，但目前尚未开放注册。它把收件箱里的邮件归入文件夹，并在每天早上就过去 24 小时的邮件写一份晨报，列出其中的待办。",
            })}
          </Text>
        </div>

        <LegalSection
          heading={t({
            en: "How it accesses mail",
            zh: "如何访问邮件",
          })}
        >
          <Text>
            {t({
              en: "It connects to an iCloud, Gmail or Outlook mailbox over IMAP. With an iCloud mailbox it can also keep the iCloud Calendar in step with the mail. Sign-in uses a passkey.",
              zh: "它通过 IMAP 连接 iCloud、Gmail 或 Outlook 邮箱。连接 iCloud 邮箱时，它还可以让 iCloud 日历与邮件保持一致。登录使用通行密钥。",
            })}
          </Text>
        </LegalSection>

        <LegalSection
          heading={t({
            en: "What it does not do",
            zh: "它不做什么",
          })}
        >
          <Text>
            {t({
              en: "It never sends mail, and it never deletes mail. It does not store the text of mail: that stays in the mailbox. Data is not sold, not used for ads, and not shared with anyone else.",
              zh: "它从不发送邮件，也从不删除邮件。它不保存邮件正文：正文留在邮箱里。数据不会被出售、不会用于广告，也不会与其他任何人共享。",
            })}
          </Text>
        </LegalSection>

        <LegalSection heading={t({ en: "More", zh: "更多信息" })}>
          <Text>
            <MetaLine
              facts={[
                <Anchor key="privacy" href={getLocalePath("/privacy", locale)}>
                  {t({ en: "Privacy policy", zh: "隐私政策" })}
                </Anchor>,
                <Anchor key="terms" href={getLocalePath("/terms", locale)}>
                  {t({ en: "Terms of use", zh: "使用条款" })}
                </Anchor>,
                <Anchor key="sign-in" href={getLocalePath("/sign-in", locale)}>
                  {t({ en: "Sign in", zh: "登录" })}
                </Anchor>,
              ]}
            />
          </Text>
        </LegalSection>
      </article>
    </AssistantFrame>
  );
}
