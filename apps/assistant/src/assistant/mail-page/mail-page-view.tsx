import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { border, controlHeight } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { MailProvider } from "#src/assistant/db/schema.ts";
import type { MailAddress } from "#src/assistant/mail/imap/types.ts";
import type {
  KnownMailHeaders,
  MailView,
  MailViewResult,
} from "#src/assistant/mail/view/read-mail-view.ts";
import { ReconnectCause } from "#src/assistant/mailboxes/reconnect-cause.tsx";
import { ReconnectLink } from "#src/assistant/mailboxes/reconnect-link.tsx";
import { Folder } from "#src/assistant/shell/folder.tsx";
import { keepTogether } from "#src/assistant/shell/keep-together.ts";
import { Anchor } from "#src/links/anchor.tsx";
import { MailSplitView } from "./mail-split-view.tsx";

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

/** How the mail's web images load, when it has any. */
function ImagesNotice({
  proxied,
  unloaded,
  trackers,
}: {
  proxied: number;
  unloaded: number;
  trackers: number;
}) {
  const sentences = [
    proxied > 0
      ? t({
          en: "Images load through the app, so the sender does not see your IP address or device.",
          zh: "图片经由本应用加载，发件人看不到你的 IP 地址和设备。",
        })
      : null,
    unloaded > 0
      ? t({
          en: "Images from the web are not loaded, so the sender cannot tell that you opened this mail.",
          zh: "网络图片未加载，发件人因此无法知道你打开了这封邮件。",
        })
      : null,
    trackers === 1
      ? t({
          en: "1 tracking image was blocked.",
          zh: "已拦截 1 张跟踪图片。",
        })
      : trackers > 1
        ? t({
            en: "{count} tracking images were blocked.",
            zh: "已拦截 {count} 张跟踪图片。",
          }).replace("{count}", String(trackers))
        : null,
  ].filter((sentence) => sentence !== null);
  if (sentences.length === 0) return null;
  return (
    <Text as="p" look="caption" tone="muted">
      {sentences.join(t({ en: " ", zh: "" }))}
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
    <div css={[stack.group, typeModifier.verbatim]}>
      <header css={stack.item}>
        <Heading level={1} look="h1" css={styles.wrap}>
          {mail.subject.trim() || t({ en: "No subject", zh: "无主题" })}
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
            <MetaLine
              facts={[
                mail.sentAt
                  ? keepTogether(formatter.format(mail.sentAt))
                  : null,
                <span key="folder">
                  {t({ en: "In ", zh: "位于" })}
                  <Folder path={mail.folder} />
                </span>,
              ]}
            />
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
          <ImagesNotice
            proxied={mail.body.proxiedImages}
            unloaded={mail.body.unloadedImages}
            trackers={mail.body.blockedTrackers}
          />
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

/** The subject and sender that the agents kept, when the mail cannot be read. */
function KnownHeader({ known }: { known: KnownMailHeaders | null }) {
  const subject = known?.subject?.trim();
  return (
    <header css={stack.item}>
      <Heading level={1} look="h1" css={styles.wrap}>
        {subject || t({ en: "Mail", zh: "邮件" })}
      </Heading>
      {known?.sender ? (
        <Text as="p" look="bodySmall" weight="semibold" css={styles.wrap}>
          {known.sender}
        </Text>
      ) : null}
    </header>
  );
}

function Problem({
  result,
  openHref,
}: {
  result: Exclude<MailViewResult, { kind: "found" }>;
  openHref: string | null;
}) {
  const messages = {
    "not-found": t({
      en: "This mail is no longer in the mailbox. It may have been deleted.",
      zh: "邮箱里已经没有这封邮件了，可能已被删除。",
    }),
    reconnect: (
      <>
        <ReconnectLink addresses={[result.account.address]} />
        {t({ en: ". ", zh: "。" })}
        <ReconnectCause
          code={result.kind === "reconnect" ? result.code : null}
        />
        {t({
          en: " The app cannot open this mail until you do.",
          zh: "在你重新连接之前，应用无法打开这封邮件。",
        })}
      </>
    ),
    unavailable: t({
      en: "Could not reach the mail server. Try again in a minute.",
      zh: "暂时连不上邮件服务器，请稍后再试。",
    }),
  };
  return (
    <div css={[stack.group, typeModifier.verbatim]}>
      <KnownHeader known={result.known} />
      <Callout
        intent={result.kind === "unavailable" ? "danger" : "warning"}
        role="alert"
      >
        {messages[result.kind]}
      </Callout>
      {openHref ? (
        <div css={cluster.tight}>
          <OpenInMailApp provider={result.account.provider} href={openHref} />
        </div>
      ) : null}
    </div>
  );
}

function SkeletonLine({
  width,
  delay,
  look,
}: {
  width: string;
  delay: number;
  look: "bodySmall" | "caption";
}) {
  return (
    <Text as="div" look={look}>
      <Skeleton width={width} height="1lh" delay={delay} />
    </Text>
  );
}

/** The mail page's frame, with the way back. */
function MailFrame({ children }: { children: ReactNode }) {
  return (
    <MailSplitView
      labels={{
        mail: t({ en: "Mail", zh: "邮件" }),
        home: t({ en: "Today", zh: "今天" }),
        homeReport: t({ en: "Report", zh: "晨报" }),
        homePlan: t({ en: "Plan", zh: "计划" }),
        pages: [
          ["/todos/done", t({ en: "Done", zh: "已完成" })],
          ["/todos", t({ en: "To-dos", zh: "待办" })],
          ["/reports", t({ en: "All reports", zh: "全部晨报" })],
          ["/activity", t({ en: "Activity", zh: "动态" })],
          [
            "/report-preview",
            t({ en: "Morning report preview", zh: "晨报预览" }),
          ],
          ["/settings", t({ en: "Settings", zh: "设置" })],
        ],
      }}
    >
      {children}
    </MailSplitView>
  );
}

/** The mail page before it can show: the header lines over the body frame. */
export function MailPageSkeleton() {
  return (
    <MailFrame>
      <div css={stack.group} aria-busy>
        <header css={stack.item}>
          <Heading level={1} look="h1">
            <Skeleton width="min(28rem, 100%)" height="1lh" />
          </Heading>
          <div css={stack.text}>
            <SkeletonLine look="bodySmall" width="min(16rem, 70%)" delay={0} />
            <SkeletonLine
              look="bodySmall"
              width="min(20rem, 85%)"
              delay={100}
            />
            <SkeletonLine
              look="bodySmall"
              width="min(14rem, 60%)"
              delay={200}
            />
          </div>
          <div css={cluster.tight}>
            <Skeleton width="8rem" height={controlHeight.md} />
          </div>
        </header>
        <div css={stack.tight}>
          <SkeletonLine look="caption" width="min(32rem, 90%)" delay={300} />
          <div css={[corner.radius_3, styles.frame, styles.frameSkeleton]}>
            <Skeleton fill />
          </div>
        </div>
      </div>
    </MailFrame>
  );
}

/** One mail, read live from the mailbox, or why it cannot show. */
export function MailPageView({
  result,
  openHref,
  dateLocale,
  timeZone,
}: {
  result: MailViewResult;
  /** The mail in the owner's mail app or webmail. */
  openHref: string | null;
  /** The locale the page writes dates in. */
  dateLocale: string;
  timeZone: string;
}) {
  const formatter = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  return (
    <MailFrame>
      {result.kind === "found" ? (
        <FoundMail
          mail={result.mail}
          formatter={formatter}
          openHref={openHref}
          provider={result.account.provider}
        />
      ) : (
        <Problem result={result} openHref={openHref} />
      )}
    </MailFrame>
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
  frameSkeleton: {
    overflow: "hidden",
  },
});
