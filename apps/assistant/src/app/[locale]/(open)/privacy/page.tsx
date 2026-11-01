import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Text } from "@tuja/ui/components/text";
import type { Metadata } from "next";
import {
  CONTACT_ADDRESS,
  LegalPage,
  LegalSection,
} from "#src/assistant/legal/legal-page.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return {
    title: t({ en: "Privacy policy", zh: "隐私政策" }),
    robots: { index: true, follow: false },
  };
}

export default function Page() {
  return (
    <LegalPage title={t({ en: "Privacy policy", zh: "隐私政策" })}>
      <Text>
        {t({
          en: "Mail Assistant (assistant.qingqi.dev) is a personal service run by Qingqi Shi. It reads the mailboxes you connect, sorts your mail, adds dates from your mail to your calendar, and sends you one digest each morning. You can join only with an invite. This page says what it stores, where your data goes, and what you can do about it.",
          zh: "邮件助手（assistant.qingqi.dev）是石清琪运营的个人服务。它读取你连接的邮箱，为你的邮件分类，把邮件中的日期加入你的日历，并在每天早上给你发一份摘要。只能通过邀请加入。本页说明它保存什么、你的数据去往哪里，以及你可以做什么。",
        })}
      </Text>

      <LegalSection
        heading={t({
          en: "What the assistant does with your mail",
          zh: "邮件助手如何处理你的邮件",
        })}
      >
        <Text>
          {t({
            en: "It connects to your iCloud, Gmail or Outlook mailbox over IMAP. For each new message it reads the headers and the start of the text, decides how important the message is, and writes a one-line summary. When you turn on mailbox changes in the settings (they are off at first), it can also mark a message as read, flag it, or move it into one of your folders. It never deletes mail and never sends mail for you.",
            zh: "它通过 IMAP 连接你的 iCloud、Gmail 或 Outlook 邮箱。对每封新邮件，它读取邮件头和正文开头，判断邮件的重要程度，并写一句话摘要。如果你在设置中开启邮箱改动（默认关闭），它还可以把邮件标为已读、加旗标，或移到你的某个文件夹。它从不删除邮件，也从不替你发送邮件。",
          })}
        </Text>
        <Text>
          {t({
            en: "When a message mentions an appointment, a trip or a deadline, the assistant can add an event with reminders to a calendar it makes in your iCloud Calendar. It reads your other calendars only to avoid duplicates, and never changes your own events.",
            zh: "当邮件提到预约、行程或截止日期时，邮件助手可以在它于你的 iCloud 日历中创建的日历里添加带提醒的事件。它读取你的其他日历只是为了避免重复，从不修改你自己的事件。",
          })}
        </Text>
        <Text>
          {t({
            en: "Older mail is read only when you start the import of old mail. Then the assistant stores the headers of mail you already filed into a category folder, sends the rest of your old inbox and folder mail to Anthropic in batches to classify it, and reads the recipients of your sent mail to learn who you write to. Old mail never appears in a digest, is never marked, flagged or moved, and never becomes a calendar event. Its text excerpt is deleted once it is classified.",
            zh: "只有在你开始导入旧邮件后，助手才会读取更早的邮件。届时，它会保存你已归入分类文件夹的邮件的邮件头，把收件箱和其他文件夹里的其余旧邮件分批发送给 Anthropic 分类，并读取已发送邮件的收件人，以了解你和谁通信。旧邮件不会出现在摘要里，不会被标记、加旗标或移动，也不会生成日历事件。分类完成后，它的正文摘录会被删除。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "What it stores", zh: "保存哪些数据" })}>
        <Text>
          {t({
            en: "Your account: your name, the public keys of your passkeys, and your sign-in sessions. There is no password.",
            zh: "你的账户：你的名字、通行密钥的公钥，以及你的登录会话。没有密码。",
          })}
        </Text>
        <Text>
          {t({
            en: "Mailbox access: for iCloud, your address and an app-specific password that you create at Apple; for Gmail and Outlook, the access tokens that Google or Microsoft issue when you agree. These secrets are encrypted (AES-256-GCM) before they are stored.",
            zh: "邮箱访问凭据：iCloud 为你的邮箱地址和你在 Apple 创建的 App 专用密码；Gmail 和 Outlook 为你同意授权后 Google 或 Microsoft 颁发的访问令牌。这些凭据在保存前都会加密（AES-256-GCM）。",
          })}
        </Text>
        <Text>
          {t({
            en: "For each message: its headers (sender, recipients, subject, date, message ID and folder), a cleaned text excerpt of up to about 16 KB, and the result of the classification. Excerpts are deleted after 90 days. The full message is not stored: when you open a message in the app, it is read from your mailbox at that moment.",
            zh: "每封邮件：邮件头（发件人、收件人、主题、日期、邮件 ID 和所在文件夹）、最多约 16 KB 的清理后正文摘录，以及分类结果。摘录在 90 天后删除。完整邮件不会保存：你在应用中打开邮件时，才会即时从你的邮箱读取。",
          })}
        </Text>
        <Text>
          {t({
            en: "Also: your settings (time zone, digest hour), the push subscription of each device you allow, the categories and sender rules you set, and the IDs of the calendar events the assistant made.",
            zh: "此外还有：你的设置（时区、摘要时间）、你允许推送的每台设备的推送订阅、你设定的分类和发件人规则，以及邮件助手创建的日历事件 ID。",
          })}
        </Text>
      </LegalSection>

      <LegalSection
        heading={t({ en: "Where your data goes", zh: "你的数据去往哪里" })}
      >
        <Text>
          {t({
            en: "Anthropic: to classify a message and find dates in it, the assistant sends its sender, subject and up to about 4,000 characters of its text to Anthropic's Claude API. Each morning it also reads the previous day's messages from your mailboxes and sends their senders, recipients, subjects and up to about 4,000 characters of each text, with your open to-dos, to write the morning report; it stores only the report and the to-dos, never the messages. Anthropic's commercial terms say that it does not train its models on this data.",
            zh: "Anthropic：为了给邮件分类并找出其中的日期，邮件助手会把邮件的发件人、主题和最多约 4,000 个字符的正文发送到 Anthropic 的 Claude API。每天早上，它还会从你的邮箱读取前一天的邮件，把发件人、收件人、主题和每封最多约 4,000 个字符的正文连同你未完成的待办一起发送过去，用来撰写晨报；它只保存晨报和待办，从不保存这些邮件。Anthropic 的商业条款规定，它不会用这些数据训练模型。",
          })}
        </Text>
        <Text>
          {t({
            en: "The services that run the assistant: Vercel hosts the app and Neon hosts its database, both in London. Apple, Google and Microsoft receive the requests to your own mailbox and calendar. Your browser's push service (from Apple, Google or Mozilla) delivers the morning notification.",
            zh: "运行邮件助手的服务：Vercel 托管应用，Neon 托管数据库，均位于伦敦。Apple、Google 和 Microsoft 接收对你自己邮箱和日历的请求。你浏览器的推送服务（来自 Apple、Google 或 Mozilla）负责发送早间通知。",
          })}
        </Text>
        <Text>
          {t({
            en: "Your data is not sold, not used for ads, and not shared with anyone else. There are no analytics or tracking cookies: the only cookies keep you signed in and remember your language.",
            zh: "你的数据不会被出售、不会用于广告，也不会与其他任何人共享。没有分析或追踪 Cookie：仅有的 Cookie 用于保持登录和记住你的语言。",
          })}
        </Text>
      </LegalSection>

      <LegalSection
        heading={t({ en: "Google user data", zh: "Google 用户数据" })}
      >
        <Text>
          {t({
            en: "Mail Assistant's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Gmail data is used only to provide the features on this page to you, and people do not read it unless you ask for help with your account or the law requires it.",
            zh: "邮件助手对从 Google API 获得的信息的使用和传输遵守《Google API 服务用户数据政策》，包括其中的“有限使用”要求。Gmail 数据仅用于向你提供本页所述的功能；除非你请求账户方面的帮助或法律要求，不会有人阅读这些数据。",
          })}
        </Text>
      </LegalSection>

      <LegalSection
        heading={t({ en: "How it is kept safe", zh: "如何保障安全" })}
      >
        <Text>
          {t({
            en: "You sign in with a passkey. Every connection is encrypted in transit, mailbox secrets are encrypted at rest, and the database keeps each user's rows apart from every other user's.",
            zh: "你使用通行密钥登录。所有连接在传输中加密，邮箱凭据在存储时加密，数据库会把每位用户的数据与其他用户隔离。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "Your choices", zh: "你的选择" })}>
        <Text>
          {t({
            en: "You can disconnect a mailbox at any time; its stored secret is then deleted. You can also take back access at Apple (delete the app-specific password), Google or Microsoft (remove the app from your account's security settings). To delete your account and everything stored for it, write to the address below.",
            zh: "你可以随时断开邮箱连接，其保存的凭据随即删除。你也可以在 Apple（删除 App 专用密码）、Google 或 Microsoft（在账户安全设置中移除此应用）收回访问权限。如需删除你的账户及其保存的所有数据，请写信到下方地址。",
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
