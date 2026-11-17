import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { TripPage } from "#src/reader/trip-page.tsx";
import type { ResolvedDay, Trip } from "#src/trips/types.ts";
import type { TripVersion } from "./trip-history.ts";
import { VersionBar } from "./version-bar.tsx";
import { savedAtLabel } from "./version-labels.ts";

/** One version of a trip in the reader's own view, read only, under the bar that names it and restores it. */
export function VersionView({
  tripId,
  timeZone,
  version,
  trip,
  newest,
  serverToday,
  locale,
}: {
  tripId: string;
  /** The time zone of the trip as it is now, in which the history shows its times. */
  timeZone: string;
  version: TripVersion;
  /** The document of `version`. */
  trip: Trip;
  newest: TripVersion;
  serverToday: ResolvedDay;
  locale: SupportedLocale;
}) {
  return (
    <div css={stack.group}>
      <VersionBar
        tripId={tripId}
        revision={version.revision}
        seen={{ revision: newest.revision, stamp: newest.stamp }}
        savedAt={savedAtLabel(version.savedAt, timeZone, locale)}
        author={version.author}
        isCurrent={version.revision === newest.revision}
        readerHref={getLocalePath(`/${tripId}`, locale)}
        historyHref={getLocalePath(`/${tripId}/history`, locale)}
      />
      <TripPage
        tripId={tripId}
        trip={trip}
        serverToday={serverToday}
        weatherByDay={{}}
      />
    </div>
  );
}
