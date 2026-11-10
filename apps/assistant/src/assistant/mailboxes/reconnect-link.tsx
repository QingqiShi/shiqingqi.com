"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Fragment } from "react";
import { Anchor } from "#src/links/anchor.tsx";
import { AddressText } from "./address-text.tsx";

/** "Connect … again", a link to the Mailboxes settings that names the mailboxes. */
export function ReconnectLink({ addresses }: { addresses: string[] }) {
  const locale = useLocale();
  const and = t({ en: " and ", zh: "和" });
  return (
    <Anchor href={getLocalePath("/settings/mailboxes", locale)}>
      {t({ en: "Connect ", zh: "重新连接 " })}
      {addresses.map((address, index) => (
        <Fragment key={address}>
          {index > 0 ? and : null}
          <AddressText address={address} />
        </Fragment>
      ))}
      {t({ en: " again", zh: "" })}
    </Anchor>
  );
}
