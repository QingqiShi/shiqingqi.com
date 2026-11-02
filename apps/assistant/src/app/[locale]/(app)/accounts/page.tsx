import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { listAccounts } from "#src/assistant/mail/accounts/list-accounts.ts";
import type { ConnectErrorCode } from "#src/assistant/mail/oauth/make-connect-handlers.ts";
import { AccountCard } from "#src/assistant/mailboxes/account-card.tsx";
import { PasswordConnectForm } from "#src/assistant/mailboxes/password-connect-form.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Mailboxes", zh: "邮箱" }) };
}

function connectHref(slug: "google" | "microsoft", locale: string) {
  return `/api/connect/${slug}/start?locale=${locale}`;
}

function ConnectNotice({
  connected,
  error,
}: {
  connected: string | null;
  error: string | null;
}) {
  const errors: Record<ConnectErrorCode, string> = {
    "not-configured": t({
      en: "This kind of mailbox is not set up on the server yet.",
      zh: "服务器还没有配置这类邮箱。",
    }),
    state: t({
      en: "The connection took too long or came from another sign-in. Start again.",
      zh: "连接超时或登录状态不一致，请重新开始。",
    }),
    denied: t({
      en: "Access was not granted, so nothing was connected.",
      zh: "没有获得授权，所以没有连接任何邮箱。",
    }),
    token: t({
      en: "The provider did not confirm the access. Start again.",
      zh: "服务商没有确认授权，请重新开始。",
    }),
    "no-refresh-token": t({
      en: "The provider gave no lasting access. Remove the app's access in your account settings, then connect again.",
      zh: "服务商没有给出长期授权。请先在账户设置中移除本应用的访问权限，再重新连接。",
    }),
    "no-email": t({
      en: "The provider did not say which mailbox this is. Start again.",
      zh: "服务商没有告知邮箱地址，请重新开始。",
    }),
    "imap-refused": t({
      en: "The mail server refused IMAP access. In Gmail, turn on IMAP in the settings; in Outlook, check that IMAP is allowed.",
      zh: "邮件服务器拒绝了 IMAP 访问。Gmail 请在设置中开启 IMAP；Outlook 请确认允许 IMAP。",
    }),
    "mail-server-unreachable": t({
      en: "Could not reach the mail server. Try again in a minute.",
      zh: "暂时连不上邮件服务器，请稍后再试。",
    }),
  };
  if (error) {
    return (
      <Callout intent="danger" role="alert">
        {new Map<string, string>(Object.entries(errors)).get(error) ??
          errors.token}
      </Callout>
    );
  }
  if (connected) {
    return (
      <Callout intent="success" role="status">
        {t({
          en: "Connected. The assistant starts filing this inbox once organising is on in the settings.",
          zh: "已连接。在设置中开启整理后，助手就会开始整理这个收件箱。",
        })}
      </Callout>
    );
  }
  return null;
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = validateLocale((await params).locale);
  const query = await searchParams;
  const session = await requirePageSession(locale, "/accounts");
  const { accounts, timeZone } = await listAccounts({
    db: getAssistantDb(),
    userId: session.userId,
  });
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  const formatDate = (date: Date) => formatter.format(date);

  return (
    <div css={stack.section}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Mailboxes", zh: "邮箱" })}
        </Heading>
        <Text as="p" tone="muted">
          {t({
            en: "Once you turn on organising in the settings, the assistant files your inbox mail into folders every 15 minutes and leaves it unread. Until then it changes nothing. It never deletes mail.",
            zh: "在设置中开启整理后，助手每 15 分钟把收件箱里的邮件归入文件夹，并保持未读。开启之前它不会改动任何邮件。它从不删除邮件。",
          })}
        </Text>
      </div>
      <ConnectNotice
        connected={typeof query.connected === "string" ? query.connected : null}
        error={typeof query.error === "string" ? query.error : null}
      />
      {accounts.length > 0 ? (
        <div css={stack.item}>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              formatDate={formatDate}
              reconnectHref={
                account.provider === "gmail"
                  ? connectHref("google", locale)
                  : account.provider === "outlook"
                    ? connectHref("microsoft", locale)
                    : null
              }
            />
          ))}
        </div>
      ) : null}
      <Section
        title={t({
          en: "Connect Gmail or Outlook",
          zh: "连接 Gmail 或 Outlook",
        })}
        description={t({
          en: "You sign in at Google or Microsoft and allow mail access. The app keeps the access, never your password.",
          zh: "在 Google 或 Microsoft 登录并允许访问邮件。应用只保存授权，不保存你的密码。",
        })}
      >
        <div css={cluster.tight}>
          <AnchorButton href={connectHref("google", locale)} look="outline">
            {t({ en: "Connect Gmail", zh: "连接 Gmail" })}
          </AnchorButton>
          <AnchorButton href={connectHref("microsoft", locale)} look="outline">
            {t({ en: "Connect Outlook", zh: "连接 Outlook" })}
          </AnchorButton>
        </div>
      </Section>
      <Section
        title={t({ en: "Connect iCloud Mail", zh: "连接 iCloud 邮件" })}
        description={t({
          en: "iCloud needs an app-specific password. The app tries it once before it saves it, encrypted.",
          zh: "iCloud 需要 App 专用密码。应用会先试用一次，成功后加密保存。",
        })}
      >
        <PasswordConnectForm provider="icloud" />
      </Section>
      <Section
        title={t({
          en: "Gmail with an app password",
          zh: "用应用专用密码连接 Gmail",
        })}
        description={t({
          en: "Use this if Google keeps asking you to connect Gmail again.",
          zh: "如果 Google 总是要求重新连接 Gmail，可以改用这种方式。",
        })}
      >
        <PasswordConnectForm provider="gmail" />
      </Section>
    </div>
  );
}
