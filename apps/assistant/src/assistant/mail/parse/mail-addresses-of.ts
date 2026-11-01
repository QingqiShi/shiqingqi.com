import type { Address } from "postal-mime";
import type { MailAddress } from "#src/assistant/mail/imap/types.ts";

/** Every mailbox in a postal-mime address list, groups flattened. */
export function mailAddressesOf(list: Address[] | undefined): MailAddress[] {
  return (list ?? []).flatMap((entry) =>
    (entry.group ?? [entry]).map((mailbox) => ({
      name: mailbox.name || null,
      address: mailbox.address || null,
    })),
  );
}
