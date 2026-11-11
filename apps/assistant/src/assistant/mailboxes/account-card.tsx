import { AppleLogoIcon } from "@phosphor-icons/react/dist/ssr/AppleLogo";
import { GoogleLogoIcon } from "@phosphor-icons/react/dist/ssr/GoogleLogo";
import { MicrosoftOutlookLogoIcon } from "@phosphor-icons/react/dist/ssr/MicrosoftOutlookLogo";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PROVIDER_NAMES } from "#src/assistant/mailboxes/provider-names.ts";
import type { MailProvider } from "../db/schema.ts";
import { RECONNECT_CODES } from "../mail/accounts/describe-sync-error.ts";
import type { AccountSummary } from "../mail/accounts/list-accounts.ts";
import type { WriteErrorCode } from "../mail/accounts/record-write-state.ts";
import { AccountActions } from "./account-actions.tsx";
import { AddressText } from "./address-text.tsx";
import { ReconnectCause } from "./reconnect-cause.tsx";

function StatusBadge({ status }: { status: AccountSummary["status"] }) {
  if (status === "ok") {
    return (
      <Badge intent="success" size="sm">
        {t({ en: "Connected", zh: "已连接" })}
      </Badge>
    );
  }
  if (status === "reconnect") {
    return (
      <Badge intent="warning" size="sm">
        {t({ en: "Connect again", zh: "需要重新连接" })}
      </Badge>
    );
  }
  return (
    <Badge intent="destructive" size="sm">
      {t({ en: "Last run failed", zh: "上次运行失败" })}
    </Badge>
  );
}

function ProviderMark({ provider }: { provider: MailProvider }) {
  if (provider === "gmail") return <GoogleLogoIcon weight="fill" aria-hidden />;
  if (provider === "outlook")
    return <MicrosoftOutlookLogoIcon weight="fill" aria-hidden />;
  return <AppleLogoIcon weight="fill" aria-hidden />;
}

function ErrorText({ code }: { code: string }) {
  const messages: Record<string, string> = {
    token_refresh_failed: t({
      en: "The provider did not renew access. The next run tries again.",
      zh: "服务商没有续期授权，下次运行会再试。",
    }),
    not_configured: t({
      en: "This kind of mailbox is not set up on the server yet.",
      zh: "服务器还没有配置这类邮箱。",
    }),
  };
  const failed = t({
    en: "The run stopped with an error. The next run tries again.",
    zh: "运行出错中断，下次运行会再试。",
  });
  return (
    <Text as="p" look="bodySmall">
      {RECONNECT_CODES.has(code) ? (
        <>
          <ReconnectCause code={code} />
          {t({ en: " Connect the mailbox again.", zh: "请重新连接邮箱。" })}
        </>
      ) : (
        (new Map(Object.entries(messages)).get(code) ?? failed)
      )}
    </Text>
  );
}

function WriteErrorText({ code }: { code: string }) {
  const messages: Record<WriteErrorCode, string> = {
    move_unsupported: t({
      en: "This mail server cannot move mail safely. The assistant still reads this mailbox for the morning report, but leaves its mail where it is.",
      zh: "这个邮件服务器无法安全地移动邮件。助手仍会读取这个邮箱来写晨报，但邮件会留在原来的位置。",
    }),
  };
  return (
    <Text as="p" look="bodySmall">
      {new Map<string, string>(Object.entries(messages)).get(code) ??
        t({
          en: "The assistant could not change some mail in this mailbox. The next run tries again.",
          zh: "助手没能改动这个邮箱里的部分邮件，下次运行会再试。",
        })}
    </Text>
  );
}

/**
 * One connected mailbox, a row of a `List`: its last check, or the time of
 * a check that failed since, the last error, and what to do about it. The
 * error is the one line that says what to do; the server's own words stay in
 * the log.
 */
export function AccountCard({
  account,
  formatDate,
  reconnectHref,
}: {
  account: AccountSummary;
  formatDate: (date: Date) => string;
  /** The OAuth start route, for a Gmail or Outlook account. */
  reconnectHref: string | null;
}) {
  const { lastErrorAt, lastSyncedAt } = account;
  const failedAt =
    lastErrorAt !== null &&
    (lastSyncedAt === null || lastErrorAt > lastSyncedAt)
      ? lastErrorAt
      : null;
  const lastCheck = failedAt
    ? t({
        en: "Check failed {date}",
        zh: "检查失败 {date}",
      }).replace("{date}", formatDate(failedAt))
    : account.lastSyncedAt
      ? t({
          en: "Last checked {date}",
          zh: "上次检查 {date}",
        }).replace("{date}", formatDate(account.lastSyncedAt))
      : t({ en: "Not checked yet", zh: "尚未检查" });
  const reconnect = account.status === "reconnect" && reconnectHref !== null;
  const hasNotes =
    reconnect ||
    account.lastErrorCode !== null ||
    account.writeErrorCode !== null;

  return (
    <ListRow
      wrap
      leading={<ProviderMark provider={account.provider} />}
      leadingShape="square"
      detail={
        <MetaLine
          facts={[
            <StatusBadge key="status" status={account.status} />,
            PROVIDER_NAMES[account.provider],
            lastCheck,
          ]}
        />
      }
      extra={
        hasNotes ? (
          <div css={[stack.tight, styles.notes]}>
            {account.lastErrorCode ? (
              <ErrorText code={account.lastErrorCode} />
            ) : null}
            {account.writeErrorCode ? (
              <div css={stack.text}>
                <WriteErrorText code={account.writeErrorCode} />
                {account.writeErrorMessage ? (
                  <Text look="caption" tone="muted">
                    <MetaLine
                      facts={[
                        account.writeErrorAt
                          ? formatDate(account.writeErrorAt)
                          : null,
                        account.writeErrorMessage,
                      ]}
                    />
                  </Text>
                ) : null}
              </div>
            ) : null}
            {reconnect ? (
              <Button href={reconnectHref} size="sm" look="primary">
                {t({ en: "Connect again", zh: "重新连接" })}
              </Button>
            ) : null}
          </div>
        ) : null
      }
      actions={<AccountActions accountId={account.id} />}
    >
      <AddressText address={account.address} />
    </ListRow>
  );
}

const styles = stylex.create({
  notes: {
    alignItems: "flex-start",
    paddingBlockStart: space._1,
    paddingBlockEnd: space._1,
  },
});
