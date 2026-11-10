import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import { fillTemplate } from "../shell/fill-template.tsx";
import { MailboxesLink } from "./mailboxes-link.tsx";

/**
 * Takes the place of a control that needs a mailbox while none is connected:
 * says why, and links to Mailboxes.
 */
export function ConnectMailboxFirst({
  why,
}: {
  /** What the control does with a mailbox, as one sentence. */
  why: string;
}) {
  return (
    <Callout
      intent="info"
      role="status"
      title={t({ en: "Connect a mailbox first", zh: "请先连接邮箱" })}
    >
      {fillTemplate(
        t({
          en: "{why} Connect one in {mailboxes}.",
          zh: "{why}请在{mailboxes}中连接一个。",
        }),
        {
          why,
          mailboxes: <MailboxesLink />,
        },
      )}
    </Callout>
  );
}
