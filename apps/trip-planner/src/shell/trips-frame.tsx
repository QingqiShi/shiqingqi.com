"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link, LinkStatus } from "@tuja/next-links/link";
import { Badge } from "@tuja/ui/components/badge";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import { NewTripFloatingButton } from "#src/new-trip/new-trip-button.tsx";
import { useDayNumber } from "#src/reader/use-day-number.ts";
import { useTripHash } from "#src/reader/use-trip-location.ts";
import { TripSkeleton } from "./trip-skeleton.tsx";
import type { TripSummary } from "./trip-summary.ts";
import { useOnReturn } from "./use-on-return.ts";

function TripLink({ trip, current }: { trip: TripSummary; current: boolean }) {
  const locale = useLocale();
  const dayLabel = useDayNumber(trip);
  return (
    <NavLink
      href={getLocalePath(`/${trip.id}`, locale)}
      current={current}
      trailing={
        trip.phase === "during" ? (
          <Badge size="sm">{dayLabel(trip.dayIndex)}</Badge>
        ) : (
          <Text as="span" look="caption" tone="muted">
            {trip.dates}
          </Text>
        )
      }
    >
      <span lang={trip.language}>{trip.title}</span>
    </NavLink>
  );
}

function TripNav({
  trips,
  current,
}: {
  trips: TripSummary[];
  current: string | null;
}) {
  const ahead = trips.filter((trip) => trip.phase !== "after");
  const past = trips.filter((trip) => trip.phase === "after");
  const groups = [
    { label: t({ en: "Upcoming", zh: "即将出发" }), trips: ahead },
    { label: t({ en: "Past", zh: "已结束" }), trips: past },
  ].filter((group) => group.trips.length > 0);

  return (
    <nav aria-label={t({ en: "Trips", zh: "行程" })}>
      <NavList>
        {groups.map((group) => (
          <NavGroup key={group.label} label={group.label}>
            {group.trips.map((trip) => (
              <TripLink
                key={trip.id}
                trip={trip}
                current={trip.id === current}
              />
            ))}
          </NavGroup>
        ))}
      </NavList>
    </nav>
  );
}

/**
 * The trips beside the open trip where both fit. Where they do not, `/` is
 * the list, and a trip opens over it with a way back. A visitor with no trip
 * gets the page alone.
 */
export function TripsFrame({
  trips,
  children,
}: {
  trips: TripSummary[];
  children: ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const [segment, page, version] = segments;
  const hash = useTripHash();
  useOnReturn(() => {
    router.refresh();
  });
  const open = trips.find((trip) => trip.id === segment) ?? null;
  const listHref = getLocalePath("/", locale);
  const listLabel = t({ en: "Trips", zh: "行程" });
  const historyLabel = t({ en: "History", zh: "历史版本" });
  const backOf = (trip: TripSummary) => {
    const tripPath = (path: string) =>
      getLocalePath(`/${trip.id}${path}`, locale);
    switch (page) {
      case "edit":
        // The way back from the edit screen is the reader, at the day that
        // the hash names: the day of the last change.
        return { href: tripPath("") + hash, label: trip.title };
      case "history":
        return version
          ? { href: tripPath("/history"), label: historyLabel }
          : { href: tripPath(""), label: trip.title };
      default:
        return { href: listHref, label: listLabel };
    }
  };
  const back = open ? backOf(open) : null;

  // With no trip, a list column is an empty box, and on a phone it is the
  // whole page.
  if (trips.length === 0) {
    return (
      <NavigationStack
        label={listLabel}
        accessory={segments.length === 0 ? <NewTripFloatingButton /> : null}
        css={pageColumn.report}
      >
        {children}
      </NavigationStack>
    );
  }

  return (
    <NavigationSplitView
      linkComponent={Link}
      linkStatus={LinkStatus}
      skeleton={<TripSkeleton />}
      css={pageColumn.report}
      replace={(href) => {
        router.replace(href);
      }}
      sidebar={{
        href: listHref,
        label: listLabel,
        node: <TripNav trips={trips} current={open?.id ?? null} />,
        accessory: <NewTripFloatingButton />,
      }}
      content={{
        key: open ? [open.id, page, version].filter(Boolean).join("/") : "home",
        label: page === "history" ? historyLabel : (open?.title ?? listLabel),
        back,
        node: children,
      }}
    />
  );
}
