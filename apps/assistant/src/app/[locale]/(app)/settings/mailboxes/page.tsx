import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { userSettings } from "#src/assistant/db/schema.ts";
import { listAccounts } from "#src/assistant/mail/accounts/list-accounts.ts";
import type { ConnectErrorCode } from "#src/assistant/mail/oauth/make-connect-handlers.ts";
import { AccountCard } from "#src/assistant/mailboxes/account-card.tsx";
import { GmailPasswordConnect } from "#src/assistant/mailboxes/gmail-password-connect.tsx";
import { PasswordConnectForm } from "#src/assistant/mailboxes/password-connect-form.tsx";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { formatTimeInZone } from "#src/assistant/report-page/format-day.ts";
import { SettingsSection } from "#src/assistant/settings/settings-section.tsx";
import { getDateLocale } from "#src/assistant/shell/get-date-locale.ts";

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
  organising,
}: {
  connected: string | null;
  error: string | null;
  organising: boolean;
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
      en: "The provider gave no lasting access. Remove the app’s access in your account settings, then connect again.",
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
      <Callout intent="destructive" role="alert">
        {new Map<string, string>(Object.entries(errors)).get(error) ??
          errors.token}
      </Callout>
    );
  }
  if (connected) {
    return (
      <Callout intent="success" role="status">
        {organising
          ? t({
              en: "Connected. The assistant files this inbox from its next run.",
              zh: "已连接。助手下一次运行时就开始整理这个收件箱。",
            })
          : t({
              en: "Connected. The assistant starts filing this inbox once you turn on Organise.",
              zh: "已连接。开启“整理”后，助手就会开始整理这个收件箱。",
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
  const session = await requirePageSession(locale, "/settings/mailboxes");
  const db = getAssistantDb();
  const [{ accounts, timeZone }, organising] = await Promise.all([
    listAccounts({ db, userId: session.userId }),
    db
      .select({ enabled: userSettings.organiseEnabled })
      .from(userSettings)
      .where(eq(userSettings.userId, session.userId))
      .then((rows) => rows.at(0)?.enabled ?? false),
  ]);
  const place = {
    today: localClock(new Date(), timeZone).date,
    locale: await getDateLocale(locale),
    timeZone,
  };
  const formatDate = (date: Date) =>
    formatTimeInZone(date.toISOString(), place);

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Mailboxes", zh: "邮箱" })}
      description={
        organising
          ? t({
              en: "Connect each mailbox the assistant should read and file. It never deletes or sends mail.",
              zh: "连接要让助手读取和整理的邮箱。助手从不删除或发送邮件。",
            })
          : t({
              en: "Connect each mailbox the assistant should read for the morning report. It never deletes or sends mail.",
              zh: "连接要让助手为晨报读取的邮箱。助手从不删除或发送邮件。",
            })
      }
    >
      <ConnectNotice
        connected={typeof query.connected === "string" ? query.connected : null}
        error={typeof query.error === "string" ? query.error : null}
        organising={organising}
      />
      <div css={stack.section}>
        {accounts.length > 0 ? (
          <List>
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
          </List>
        ) : null}
        <SettingsSection
          level={3}
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
            <Button href={connectHref("google", locale)} look="outline">
              {t({ en: "Connect Gmail", zh: "连接 Gmail" })}
            </Button>
            <Button href={connectHref("microsoft", locale)} look="outline">
              {t({ en: "Connect Outlook", zh: "连接 Outlook" })}
            </Button>
            <GmailPasswordConnect />
          </div>
        </SettingsSection>
        <SettingsSection
          level={3}
          title={t({ en: "Connect iCloud Mail", zh: "连接 iCloud 邮件" })}
          description={t({
            en: "iCloud needs an app-specific password. The app tries it once before it saves it, encrypted.",
            zh: "iCloud 需要 App 专用密码。应用会先试用一次，成功后加密保存。",
          })}
        >
          <PasswordConnectForm provider="icloud" />
        </SettingsSection>
      </div>
    </SettingsSection>
  );
}
