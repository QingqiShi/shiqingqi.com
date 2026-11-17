"use client";

import { DeleteAccountSheet } from "@tuja/auth-ui/components/delete-account-sheet";
import { postAuth } from "@tuja/auth-ui/passkey-client";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Section } from "@tuja/ui/components/section";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { forgetAccountPages } from "./forget-account-pages.ts";
import { SettingsSection } from "./settings-section.tsx";

export interface AccountTrip {
  id: string;
  title: string;
}

interface AccountSettingsProps {
  email: string;
  /** The trips that only this user owns: a deletion of the account deletes them. */
  tripsThatGo: AccountTrip[];
  /** The trips that stay for their other members when the account goes. */
  tripsThatStay: AccountTrip[];
}

function TripList({
  title,
  description,
  trips,
}: {
  title: string;
  description: string;
  trips: AccountTrip[];
}) {
  if (trips.length === 0) return null;
  return (
    <Section title={title} description={description}>
      <List aria-label={title}>
        {trips.map((trip) => (
          <ListRow key={trip.id} wrap>
            {trip.title}
          </ListRow>
        ))}
      </List>
    </Section>
  );
}

/** The signed-in account: its email, sign-out, and the deletion of the account with the trips that only it owns. */
export function AccountSettings({
  email,
  tripsThatGo,
  tripsThatStay,
}: AccountSettingsProps) {
  const locale = useLocale();
  const [signingOut, setSigningOut] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /** A full load, so that no page that the router keeps shows the account. */
  const leave = async (path: string) => {
    await forgetAccountPages().catch(() => undefined);
    window.location.assign(getLocalePath(path, locale));
  };

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Account", zh: "账号" })}
      description={`${t({ en: "You are signed in as ", zh: "当前登录账号：" })}${email}${t({ en: ".", zh: "。" })}`}
    >
      <div css={cluster.tight}>
        <Button
          look="outline"
          loading={signingOut}
          onClick={() => {
            setSigningOut(true);
            void postAuth("/sign-out")
              .catch(() => undefined)
              .then(() => leave("/settings"));
          }}
        >
          {t({ en: "Sign out", zh: "退出登录" })}
        </Button>
        <Button
          look="ghost"
          intent="destructive"
          disabled={signingOut}
          onClick={() => {
            setConfirming(true);
          }}
        >
          {t({ en: "Delete account", zh: "删除账号" })}
        </Button>
      </div>
      <DeleteAccountSheet
        isOpen={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        onDeleted={() => leave("/")}
      >
        <TripList
          title={t({ en: "Trips that are deleted", zh: "会被删除的行程" })}
          description={t({
            en: "Only you own these. They are deleted with everything in them, also for the people you shared them with.",
            zh: "这些行程只有你是所有者。它们会连同全部内容一起删除，你邀请的人也将无法再看到。",
          })}
          trips={tripsThatGo}
        />
        <TripList
          title={t({ en: "Trips that stay", zh: "会保留的行程" })}
          description={t({
            en: "You leave these. They stay for their other members.",
            zh: "你会退出这些行程，它们仍为其他成员保留。",
          })}
          trips={tripsThatStay}
        />
      </DeleteAccountSheet>
    </SettingsSection>
  );
}
