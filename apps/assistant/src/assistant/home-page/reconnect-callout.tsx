import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import type { MailboxHealth } from "../mailboxes/read-mailbox-health.ts";
import { ReconnectCause } from "../mailboxes/reconnect-cause.tsx";
import { ReconnectLink } from "../mailboxes/reconnect-link.tsx";

/** Asks for a new connect of each mailbox that the assistant can no longer sign in to. */
export function ReconnectCallout({ health }: { health: MailboxHealth }) {
  if (health.reconnect.length === 0) return null;
  return (
    <Callout intent="warning">
      <ReconnectLink
        addresses={health.reconnect.map(({ address }) => address)}
      />
      {t({ en: ". ", zh: "。" })}
      {health.reconnect.length === 1 ? (
        <>
          <ReconnectCause code={health.reconnect[0]?.code} />
          {t({
            en: " Its mail is missing from your reports until you do.",
            zh: "在你重新连接之前，它的邮件不会出现在晨报里。",
          })}
        </>
      ) : (
        t({
          en: "The assistant can no longer sign in to them, so their mail is missing from your reports until you do.",
          zh: "助手已无法登录这些邮箱，在你重新连接之前，它们的邮件不会出现在晨报里。",
        })
      )}
    </Callout>
  );
}
