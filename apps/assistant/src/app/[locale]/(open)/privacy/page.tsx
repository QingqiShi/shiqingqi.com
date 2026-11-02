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
          en: "Mail Assistant (assistant.qingqi.dev) is a personal service that Qingqi Shi runs for his own use. It files the mail in the inboxes you connect into folders, and each morning it writes a report of the previous day's mail with the to-dos it finds. This page says what it stores, where your data goes, and what you can do about it.",
          zh: "邮件助手（assistant.qingqi.dev）是石清琪为自己使用而运营的个人服务。它把你连接的邮箱收件箱里的邮件归入文件夹，并在每天早上就前一天的邮件写一份晨报，列出其中的待办。本页说明它保存什么、你的数据去往哪里，以及你可以做什么。",
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
            en: "It connects to your iCloud, Gmail or Outlook mailbox over IMAP. When you turn on organising in the settings (it is off at first), an AI agent goes through your inbox every 15 minutes. It reads the headers of each message, and a second model, which cannot change your mailbox, reads the text of the messages the agent needs to understand. The agent then moves each message into one of your folders, a new folder or the Junk folder, and can flag it. It can also rename your folders, merge them, and delete a folder once it is empty. It cannot delete or send mail, and it never moves mail into the Trash.",
            zh: "它通过 IMAP 连接你的 iCloud、Gmail 或 Outlook 邮箱。如果你在设置中开启整理（默认关闭），AI 智能体每 15 分钟处理一遍收件箱：它读取每封邮件的邮件头；需要了解内容的邮件，由另一个无法改动你邮箱的模型读取正文。然后智能体把每封邮件移到你的某个文件夹、一个新文件夹或垃圾邮件箱，也可以给它加旗标。它还可以重命名、合并你的文件夹，并删除已经清空的文件夹。它无法删除或发送邮件，也从不把邮件移到废纸篓。",
          })}
        </Text>
        <Text>
          {t({
            en: "Each morning it reads the previous day's messages from your folders, without changing them, and writes a short report and a list of to-dos. It never deletes mail and never sends mail for you.",
            zh: "每天早上，它会读取你各个文件夹里前一天的邮件（不做任何改动），写一份简短的晨报和一份待办清单。它从不删除邮件，也从不替你发送邮件。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "What it stores", zh: "保存哪些数据" })}>
        <Text>
          {t({
            en: "It does not store the text of your mail: that stays in your mailbox and is read when a job needs it. It keeps a log of what the organising agent did: for each message it moved or flagged, the subject, the sender, the message's ID, the folders and the agent's reason; for each folder it made, renamed or deleted, the folder's names and the reason; for each run, the steps the agent took, which can quote subjects, senders and the short descriptions of messages that the second model wrote.",
            zh: "它不保存邮件正文：正文留在你的邮箱里，只在任务需要时读取。它会保存整理智能体的操作记录：对它移动或加旗标的每封邮件，记录主题、发件人、邮件 ID、所在文件夹和智能体给出的理由；对它新建、重命名或删除的每个文件夹，记录文件夹名称和理由；对每次运行，记录智能体执行的步骤，其中可能包含主题、发件人，以及第二个模型为邮件写下的简短描述。",
          })}
        </Text>
        <Text>
          {t({
            en: "Your account: your name, the public keys of your passkeys, and your sign-in sessions. There is no password.",
            zh: "你的账户：你的名字、通行密钥的公钥，以及你的登录会话。没有密码。",
          })}
        </Text>
        <Text>
          {t({
            en: "Mailbox access: your address and, for iCloud, an app-specific password that you create at Apple; for Gmail and Outlook, the access tokens that Google or Microsoft issue when you agree. These secrets are encrypted (AES-256-GCM) before they are stored. It also keeps the time and the error of the last failed login.",
            zh: "邮箱访问凭据：你的邮箱地址，以及 iCloud 的 App 专用密码（你在 Apple 创建），或你同意授权后 Google 或 Microsoft 颁发的 Gmail 和 Outlook 访问令牌。这些凭据在保存前都会加密（AES-256-GCM），另外还保存上次登录失败的时间和错误信息。",
          })}
        </Text>
        <Text>
          {t({
            en: "Morning reports and to-dos: the words that the AI model wrote, which can name a sender or a subject, and whether you ticked a to-do off. For a line that links to a message, it keeps the mailbox and the message's ID, so that the link opens the message in your mailbox.",
            zh: "晨报和待办：AI 模型写下的文字（其中可能提到某个发件人或主题），以及你是否已勾选完成某条待办。对于链接到某封邮件的条目，它保存所在邮箱和该邮件的 ID，以便链接能在你的邮箱中打开这封邮件。",
          })}
        </Text>
        <Text>
          {t({
            en: "Also: your settings (time zone, report hour, language, whether organising is on, and your notes on where mail goes) and the push subscription of each device you allow.",
            zh: "此外还有：你的设置（时区、晨报时间、语言、是否开启整理，以及你写下的邮件归类说明），以及你允许推送的每台设备的推送订阅。",
          })}
        </Text>
      </LegalSection>

      <LegalSection
        heading={t({ en: "Where your data goes", zh: "你的数据去往哪里" })}
      >
        <Text>
          {t({
            en: "Anthropic: to organise your inbox, the assistant sends the sender, recipients, subject and date of its messages, with your folder names and your notes, to Anthropic's Claude API, and for the messages the agent needs to understand, up to about 6,000 characters of their text. To write the morning report, it sends the sender, recipients, subject, date and the start of the text of the previous day's messages with your open to-dos. Anthropic's commercial terms say that it does not train its models on this data.",
            zh: "Anthropic：为了整理收件箱，邮件助手会把邮件的发件人、收件人、主题和日期，连同你的文件夹名称和归类说明，发送到 Anthropic 的 Claude API；对智能体需要了解内容的邮件，还会发送最多约 6,000 个字符的正文。为了撰写晨报，它会把前一天邮件的发件人、收件人、主题、日期和正文开头，连同你未完成的待办一起发送过去。Anthropic 的商业条款规定，它不会用这些数据训练模型。",
          })}
        </Text>
        <Text>
          {t({
            en: "The services that run the assistant: Vercel hosts the app and Neon hosts its database, both in London. Apple, Google and Microsoft receive the requests to your own mailbox. Your browser's push service (from Apple, Google or Mozilla) delivers the morning notification.",
            zh: "运行邮件助手的服务：Vercel 托管应用，Neon 托管数据库，均位于伦敦。Apple、Google 和 Microsoft 接收对你自己邮箱的请求。你浏览器的推送服务（来自 Apple、Google 或 Mozilla）负责发送早间通知。",
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
            en: "You sign in with a passkey. Every connection is encrypted in transit, and mailbox secrets are encrypted at rest.",
            zh: "你使用通行密钥登录。所有连接在传输中加密，邮箱凭据在存储时加密。",
          })}
        </Text>
      </LegalSection>

      <LegalSection heading={t({ en: "Your choices", zh: "你的选择" })}>
        <Text>
          {t({
            en: "You can turn organising off, or disconnect a mailbox, at any time; a disconnected mailbox's stored secret is deleted at once. You can also take back access at Apple (delete the app-specific password), Google or Microsoft (remove the app from your account's security settings). To delete your account and everything stored for it, write to the address below.",
            zh: "你可以随时关闭整理或断开邮箱连接；断开后，该邮箱保存的凭据会立即删除。你也可以在 Apple（删除 App 专用密码）、Google 或 Microsoft（在账户安全设置中移除此应用）收回访问权限。如需删除你的账户及其保存的所有数据，请写信到下方地址。",
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
