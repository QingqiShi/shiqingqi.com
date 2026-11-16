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
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import { useDayNumber } from "#src/reader/use-day-number.ts";
import { TripSkeleton } from "./trip-skeleton.tsx";
import type { TripSummary } from "./trip-summary.ts";

/** The slug of the trip that the URL shows, on its page or its unlock form. */
function openSlug(segments: string[]): string | null {
  if (segments[0] === "unlock") return segments[1] ?? null;
  return segments[0] ?? null;
}

function TripLink({ trip, current }: { trip: TripSummary; current: boolean }) {
  const locale = useLocale();
  const dayNumber = useDayNumber();
  return (
    <NavLink
      href={getLocalePath(`/${trip.slug}`, locale)}
      current={current}
      trailing={
        trip.phase === "during" ? (
          <Badge size="sm">{dayNumber(trip.dayIndex)}</Badge>
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
                key={trip.slug}
                trip={trip}
                current={trip.slug === current}
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
 * the list, and a trip opens over it with a way back.
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
  const slug = openSlug(useSelectedLayoutSegments());
  const open = trips.find((trip) => trip.slug === slug) ?? null;
  const listHref = getLocalePath("/", locale);
  const listLabel = t({ en: "Trips", zh: "行程" });

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
        node: <TripNav trips={trips} current={open?.slug ?? null} />,
      }}
      content={{
        key: open?.slug ?? "home",
        label: open?.title ?? listLabel,
        back: open ? { href: listHref, label: listLabel } : null,
        node: children,
      }}
    />
  );
}
