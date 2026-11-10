"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Anchor } from "#src/links/anchor.tsx";

/** A link to the Mailboxes settings, named Mailboxes, to go in a sentence. */
export function MailboxesLink() {
  const locale = useLocale();
  return (
    <Anchor href={getLocalePath("/settings/mailboxes", locale)}>
      {t({ en: "Mailboxes", zh: "邮箱" })}
    </Anchor>
  );
}
