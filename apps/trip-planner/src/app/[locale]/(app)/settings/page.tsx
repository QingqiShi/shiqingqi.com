import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import type { Metadata } from "next";
import { getPageUser } from "#src/auth/get-page-user.ts";
import {
  AccountSettings,
  type AccountTrip,
} from "#src/settings/account-settings.tsx";
import { PreferencesSettings } from "#src/settings/preferences-settings.tsx";
import { getTripsOwnedAlone } from "#src/share/get-sharing.ts";
import { getTrips, getViewerId } from "#src/trips/get-trips.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

/** The user's trips, by what a deletion of the account does to each. */
async function tripsOfAccount(userId: string) {
  const [trips, ownedAlone] = await Promise.all([
    getTrips(),
    getTripsOwnedAlone(userId),
  ]);
  const go: AccountTrip[] = [];
  const stay: AccountTrip[] = [];
  for (const { id, trip } of trips) {
    (ownedAlone.includes(id) ? go : stay).push({ id, title: trip.title });
  }
  return { go, stay };
}

export default async function Page() {
  const [user, userId] = await Promise.all([getPageUser(), getViewerId()]);
  const accountTrips = userId ? await tripsOfAccount(userId) : null;
  return (
    <NavigationStack
      label={t({ en: "Settings", zh: "设置" })}
      css={pageColumn.settings}
    >
      <PreferencesSettings />
      {user && accountTrips ? (
        <AccountSettings
          email={user.email}
          tripsThatGo={accountTrips.go}
          tripsThatStay={accountTrips.stay}
        />
      ) : null}
    </NavigationStack>
  );
}
