import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import type { MailProvider } from "#src/assistant/db/schema.ts";
import type { MailAddress } from "#src/assistant/mail/imap/types.ts";
import type {
  MailView,
  MailViewResult,
} from "#src/assistant/mail/view/read-mail-view.ts";
import { Folder } from "#src/assistant/shell/folder.tsx";
import { Anchor } from "#src/links/anchor.tsx";

function addressText({ name, address }: MailAddress) {
  if (name && address) return `${name} <${address}>`;
  return name ?? address ?? "";
}

function OpenInMailApp({
  provider,
  href,
}: {
  provider: MailProvider;
  href: string | null;
}) {
  if (!href) return null;
  const labels: Record<MailProvider, string> = {
    gmail: t({ en: "Open in Gmail", zh: "在 Gmail 中打开" }),
    icloud: t({ en: "Open in Mail", zh: "在“邮件”中打开" }),
    outlook: t({ en: "Open Outlook", zh: "打开 Outlook" }),
  };
  return (
    <div css={cluster.tight}>
      <Button
        href={href}
        size="sm"
        look="outline"
        icon={<ArrowSquareOutIcon weight="bold" />}
        {...(href.startsWith("https:")
          ? { target: "_blank", rel: "noreferrer" }
          : {})}
      >
        {labels[provider]}
      </Button>
    </div>
  );
}

const URL_IN_TEXT = /(https?:\/\/[^\s<>"]+[^\s<>"'.,;:!?)\]])/;

/** A plain-text body, with its web links as links that open in a new tab. */
function TextBody({ text }: { text: string }) {
  return (
    <Text as="div" css={styles.textBody}>
      {text.split(URL_IN_TEXT).map((part, index) =>
        index % 2 === 1 ? (
          <Anchor key={index} href={part} target="_blank">
            {part}
          </Anchor>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function FoundMail({
  mail,
  formatter,
  openHref,
  provider,
}: {
  mail: MailView;
  formatter: Intl.DateTimeFormat;
  openHref: string | null;
  provider: MailProvider;
}) {
  const recipients = [
    { label: t({ en: "To:", zh: "收件人：" }), list: mail.to },
    { label: t({ en: "Cc:", zh: "抄送：" }), list: mail.cc },
  ].filter(({ list }) => list.length > 0);
  return (
    <div css={stack.group}>
      <header css={stack.item}>
        <Heading level={1} look="h3" css={styles.wrap}>
          {mail.subject.trim() || t({ en: "(No subject)", zh: "（无主题）" })}
        </Heading>
        <div css={[stack.text, styles.wrap]}>
          {mail.from ? (
            <Text as="p" look="bodySmall" weight="semibold">
              {addressText(mail.from)}
            </Text>
          ) : null}
          {recipients.map(({ label, list }) => (
            <Text key={label} as="p" look="bodySmall" tone="muted">
              {label} {list.map(addressText).join(", ")}
            </Text>
          ))}
          <Text as="p" look="bodySmall" tone="muted">
            {mail.sentAt ? `${formatter.format(mail.sentAt)} · ` : null}
            {t({ en: "In ", zh: "位于" })}
            <Folder path={mail.folder} />
          </Text>
        </div>
        <OpenInMailApp provider={provider} href={openHref} />
      </header>
      {mail.truncated ? (
        <Callout intent="warning">
          {t({
            en: "This mail is too large to show in full, so its end is cut off.",
            zh: "这封邮件太大，无法完整显示，结尾部分没有显示出来。",
          })}
        </Callout>
      ) : null}
      {mail.body.kind === "html" ? (
        <div css={stack.tight}>
          {mail.body.remoteContentBlocked ? (
            <Text as="p" look="caption" tone="muted">
              {t({
                en: "Images from the web are not loaded, so the sender cannot tell that you opened this mail.",
                zh: "网络图片未加载，发件人因此无法知道你打开了这封邮件。",
              })}
            </Text>
          ) : null}
          <iframe
            title={t({ en: "Mail content", zh: "邮件内容" })}
            srcDoc={mail.body.document}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            css={[corner.radius_3, styles.frame]}
          />
        </div>
      ) : (
        <TextBody text={mail.body.text} />
      )}
      {mail.attachments.length > 0 ? (
        <div css={stack.text}>
          <Text as="p" look="bodySmall" weight="semibold">
            {t({ en: "Attachments", zh: "附件" })}
          </Text>
          <Text as="p" look="bodySmall" tone="muted" css={styles.wrap}>
            {mail.attachments.join(", ")}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

function Problem({
  result,
  openHref,
  locale,
}: {
  result: Exclude<MailViewResult, { kind: "found" }>;
  openHref: string | null;
  locale: SupportedLocale;
}) {
  const messages = {
    "not-found": t({
      en: "This mail is no longer in the mailbox. It may have been deleted.",
      zh: "邮箱里已经没有这封邮件了，可能已被删除。",
    }),
    reconnect: t({
      en: "The app can no longer sign in to this mailbox. Connect it again in Mailboxes to read this mail in the app.",
      zh: "应用已无法登录这个邮箱。请在“邮箱”中重新连接，才能在应用里阅读这封邮件。",
    }),
    unavailable: t({
      en: "Could not reach the mail server. Try again in a minute.",
      zh: "暂时连不上邮件服务器，请稍后再试。",
    }),
  };
  return (
    <div css={stack.group}>
      <Heading level={1} look="h3">
        {t({ en: "Mail", zh: "邮件" })}
      </Heading>
      <Callout
        intent={result.kind === "unavailable" ? "danger" : "warning"}
        role="alert"
      >
        {messages[result.kind]}
      </Callout>
      <div css={cluster.tight}>
        {result.kind === "reconnect" ? (
          <Button
            href={getLocalePath("/settings/mailboxes", locale)}
            size="sm"
            look="outline"
          >
            {t({ en: "Mailboxes", zh: "邮箱" })}
          </Button>
        ) : null}
        <OpenInMailApp provider={result.account.provider} href={openHref} />
      </div>
    </div>
  );
}

/** One mail, read live from the mailbox, or why it cannot show. */
export function MailPageView({
  result,
  openHref,
  locale,
  timeZone,
}: {
  result: MailViewResult;
  /** The mail in the owner's mail app or webmail. */
  openHref: string | null;
  locale: SupportedLocale;
  timeZone: string;
}) {
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  return (
    <NavigationSplitView
      content={{
        label: t({ en: "Mail", zh: "邮件" }),
        node:
          result.kind === "found" ? (
            <FoundMail
              mail={result.mail}
              formatter={formatter}
              openHref={openHref}
              provider={result.account.provider}
            />
          ) : (
            <Problem result={result} openHref={openHref} locale={locale} />
          ),
      }}
    />
  );
}

const styles = stylex.create({
  wrap: {
    overflowWrap: "anywhere",
  },
  textBody: {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  frame: {
    display: "block",
    inlineSize: "100%",
    blockSize: "max(24rem, 75dvh)",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
});
