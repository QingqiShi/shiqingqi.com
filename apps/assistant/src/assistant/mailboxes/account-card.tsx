import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Badge } from "@tuja/ui/components/badge";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { PROVIDER_NAMES } from "#src/assistant/mailboxes/provider-names.ts";
import type { AccountSummary } from "../mail/accounts/list-accounts.ts";
import type { SyncErrorCode } from "../mail/sync/describe-sync-error.ts";
import { AccountActions } from "./account-actions.tsx";

function StatusBadge({ status }: { status: AccountSummary["status"] }) {
  if (status === "ok") {
    return (
      <Badge intent="success" size="sm">
        {t({ en: "Syncing", zh: "同步中" })}
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
    <Badge intent="danger" size="sm">
      {t({ en: "Last sync failed", zh: "上次同步失败" })}
    </Badge>
  );
}

function ErrorText({ code }: { code: string }) {
  const messages: Record<SyncErrorCode, string> = {
    login_refused: t({
      en: "The mail server refused the login. Connect the mailbox again.",
      zh: "邮件服务器拒绝了登录，请重新连接邮箱。",
    }),
    token_revoked: t({
      en: "Access was withdrawn or has expired. Connect the mailbox again.",
      zh: "授权已撤销或过期，请重新连接邮箱。",
    }),
    token_refresh_failed: t({
      en: "The provider did not renew access. The next sync tries again.",
      zh: "服务商没有续期授权，下次同步会再试。",
    }),
    credential_unreadable: t({
      en: "The saved login can no longer be read. Connect the mailbox again.",
      zh: "保存的登录信息无法读取，请重新连接邮箱。",
    }),
    not_configured: t({
      en: "This kind of mailbox is not set up on the server yet.",
      zh: "服务器还没有配置这类邮箱。",
    }),
    sync_failed: t({
      en: "The sync stopped with an error. The next sync tries again.",
      zh: "同步出错中断，下次同步会再试。",
    }),
  };
  return (
    <Text as="p" look="bodySmall">
      {new Map<string, string>(Object.entries(messages)).get(code) ??
        messages.sync_failed}
    </Text>
  );
}

/** One connected mailbox: its sync state, the last error, and what to do about it. */
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
  return (
    <Card css={styles.card}>
      <div css={stack.item}>
        <div css={stack.text}>
          <div css={styles.title}>
            <Text weight="semibold">{account.address}</Text>
            <StatusBadge status={account.status} />
          </div>
          <Text look="bodySmall" tone="muted">
            {PROVIDER_NAMES[account.provider]}
            {" · "}
            {account.lastSyncedAt
              ? t({ en: "Last synced {date}", zh: "上次同步 {date}" }).replace(
                  "{date}",
                  formatDate(account.lastSyncedAt),
                )
              : t({ en: "Not synced yet", zh: "尚未同步" })}
            {" · "}
            {t({ en: "{count} folders", zh: "{count} 个文件夹" }).replace(
              "{count}",
              String(account.folders),
            )}
          </Text>
        </div>
        {account.lastErrorCode ? (
          <div css={stack.text}>
            <ErrorText code={account.lastErrorCode} />
            {account.lastErrorMessage ? (
              <Text look="caption" tone="muted">
                {account.lastErrorAt
                  ? `${formatDate(account.lastErrorAt)} · `
                  : null}
                {account.lastErrorMessage}
              </Text>
            ) : null}
          </div>
        ) : null}
        <div css={styles.actions}>
          {account.status === "reconnect" && reconnectHref ? (
            <AnchorButton href={reconnectHref} size="sm" look="primary">
              {t({ en: "Connect again", zh: "重新连接" })}
            </AnchorButton>
          ) : null}
          <AccountActions accountId={account.id} />
        </div>
      </div>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    inlineSize: "100%",
  },
  title: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
  },
});
