import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Text } from "@tuja/ui/components/text";
import type { Metadata } from "next";
import {
  CONTACT_ADDRESS,
  LegalPage,
  LegalSection,
} from "#src/assistant/legal/legal-page.tsx";
import { Anchor } from "#src/links/anchor.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return {
    title: t({ en: "Terms of use", zh: "使用条款" }),
    robots: { index: true, follow: false },
  };
}

export default function Page() {
  return (
    <LegalPage title={t({ en: "Terms of use", zh: "使用条款" })}>
      <Text>
        {t({
          en: "Mail Assistant (assistant.qingqi.dev) is a personal service run by Qingqi Shi for himself and for the people he invites. By using it you agree to these terms.",
          zh: "邮件助手（assistant.qingqi.dev）是石清琪为自己和他邀请的人运营的个人服务。使用本服务即表示你同意这些条款。",
        })}
      </Text>

      <LegalSection heading={t({ en: "Your mailboxes", zh: "你的邮箱" })}>
        <Text>
          {t({
            en: "Connect only mailboxes and calendars that you are allowed to use. You can disconnect them at any time.",
            zh: "只连接你有权使用的邮箱和日历。你可以随时断开连接。",
          })}
        </Text>
      </LegalSection>

      <LegalSection
        heading={t({
          en: "The assistant can be wrong",
          zh: "邮件助手可能出错",
        })}
      >
        <Text>
          {t({
            en: "An AI model sorts your mail and finds dates in it, and it makes mistakes: it can file an important message, miss a deadline, or put an event at the wrong time. Keep checking the mail and dates that matter to you. The assistant never deletes mail, so a message it filed is still in your mailbox.",
            zh: "AI 模型为你的邮件分类并找出其中的日期，它会出错：可能把重要邮件归档、漏掉截止日期，或把事件放在错误的时间。请继续自己核对重要的邮件和日期。邮件助手从不删除邮件，所以它归档的邮件仍在你的邮箱中。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "No guarantee", zh: "不作保证" })}>
        <Text>
          {t({
            en: "The service is free and provided as it is, without any warranty. It can change, pause or stop at any time. To the extent the law allows, Qingqi Shi is not liable for any loss that comes from using it or from not being able to use it.",
            zh: "本服务免费，按现状提供，不作任何保证。它可能随时变更、暂停或停止。在法律允许的范围内，石清琪不对因使用或无法使用本服务造成的任何损失负责。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "Ending", zh: "终止" })}>
        <Text>
          {t({
            en: "You can stop using the service and ask for your account to be deleted at any time. Access can be ended for an account that misuses the service.",
            zh: "你可以随时停止使用本服务并要求删除你的账户。滥用本服务的账户可能会被终止访问。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "Privacy", zh: "隐私" })}>
        <Text>
          <Anchor href={getLocalePath("/privacy", getLocale())}>
            {t({ en: "The privacy policy", zh: "隐私政策" })}
          </Anchor>
          {t({
            en: " says what is stored and where your data goes.",
            zh: "说明保存哪些数据以及你的数据去往哪里。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "Contact", zh: "联系方式" })}>
        <Text>
          {`${t({ en: "Qingqi Shi", zh: "石清琪" })} · ${CONTACT_ADDRESS}`}
        </Text>
      </LegalSection>
    </LegalPage>
  );
}
