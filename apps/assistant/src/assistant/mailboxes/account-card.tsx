import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { PROVIDER_NAMES } from "#src/assistant/mailboxes/provider-names.ts";
import type { SyncErrorCode } from "../mail/accounts/describe-sync-error.ts";
import type { AccountSummary } from "../mail/accounts/list-accounts.ts";
import type { WriteErrorCode } from "../mail/accounts/record-write-state.ts";
import { AccountActions } from "./account-actions.tsx";

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
    <Badge intent="danger" size="sm">
      {t({ en: "Last run failed", zh: "上次运行失败" })}
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
      en: "The provider did not renew access. The next run tries again.",
      zh: "服务商没有续期授权，下次运行会再试。",
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
      en: "The run stopped with an error. The next run tries again.",
      zh: "运行出错中断，下次运行会再试。",
    }),
  };
  return (
    <Text as="p" look="bodySmall">
      {new Map<string, string>(Object.entries(messages)).get(code) ??
        messages.sync_failed}
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
 * One connected mailbox, a row of a `List`: its last check, the last error,
 * and what to do about it.
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
  return (
    <li css={listSurface.item}>
      <div css={[listSurface.row, styles.row]}>
        <Avatar
          name={PROVIDER_NAMES[account.provider]}
          shape="square"
          aria-hidden
          css={styles.avatar}
        />
        <div css={[stack.tight, styles.main]}>
          <div css={stack.text}>
            <div css={styles.title}>
              <Text weight="medium" css={styles.address}>
                {account.address}
              </Text>
              <StatusBadge status={account.status} />
            </div>
            <Text look="bodySmall" tone="muted">
              {PROVIDER_NAMES[account.provider]}
              {" · "}
              {account.lastSyncedAt
                ? t({
                    en: "Last checked {date}",
                    zh: "上次检查 {date}",
                  }).replace("{date}", formatDate(account.lastSyncedAt))
                : t({ en: "Not checked yet", zh: "尚未检查" })}
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
          {account.writeErrorCode ? (
            <div css={stack.text}>
              <WriteErrorText code={account.writeErrorCode} />
              {account.writeErrorMessage ? (
                <Text look="caption" tone="muted">
                  {account.writeErrorAt
                    ? `${formatDate(account.writeErrorAt)} · `
                    : null}
                  {account.writeErrorMessage}
                </Text>
              ) : null}
            </div>
          ) : null}
          <div css={styles.actions}>
            {account.status === "reconnect" && reconnectHref ? (
              <Button href={reconnectHref} size="sm" look="primary">
                {t({ en: "Connect again", zh: "重新连接" })}
              </Button>
            ) : null}
            <AccountActions accountId={account.id} />
          </div>
        </div>
      </div>
    </li>
  );
}

const styles = stylex.create({
  row: {
    alignItems: "flex-start",
    paddingBlock: space._3,
  },
  avatar: {
    flexShrink: 0,
  },
  main: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  title: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: rhythm.item,
    rowGap: rhythm.inline,
  },
  address: {
    minInlineSize: 0,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
  },
});
