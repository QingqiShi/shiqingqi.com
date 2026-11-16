"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { Link } from "@tuja/next-links/link";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { PageHeader } from "@tuja/ui/components/page-header";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { TabView } from "@tuja/ui/components/tab-view";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { DayBody, DayFacts, TripList } from "./sketch-parts";
import calendarTrips from "./calendar-trips.json";
import { TripCalendar } from "./trip-calendar";
import {
  CURRENT_DAY,
  dayDate,
  sketchBrand,
  sketchDestinations,
  sketchTrip,
} from "./sketch-shared";

function TripDay({ view }: { view: "day" | "calendar" }) {
  const day = sketchTrip.days[CURRENT_DAY];
  const header =
    view === "calendar"
      ? { ...calendarTrips.gb, dates: "18–30 Jun" }
      : { ...sketchTrip, dates: "11–15 Jun" };
  return (
    <div css={stack.group}>
      <PageHeader
        eyebrow={`${header.dates} · ${header.party}`}
        title={header.title}
        description={header.subtitle}
        actions={
          <SegmentedControl
            aria-label="View"
            size="sm"
            value={view}
            onChange={() => {}}
            options={[
              { value: "day", label: "Day" },
              { value: "calendar", label: "Calendar" },
            ]}
          />
        }
      />
      {view === "calendar" ? <TripCalendar /> : null}
      {view === "calendar" ? null : (
        <>
          <div css={cluster.tight}>
            <Button
              look="outline"
              size="sm"
              icon={<CaretLeftIcon weight="bold" />}
              aria-label="Previous day"
            />
            <Select
              label="Day"
              labelHidden
              size="sm"
              defaultValue={String(CURRENT_DAY)}
              options={sketchTrip.days.map((d, i) => ({
                value: String(i),
                label: `Day ${i} · ${dayDate(d)}${i === CURRENT_DAY ? " · Today" : ""}`,
              }))}
            />
            <Button
              look="outline"
              size="sm"
              icon={<CaretRightIcon weight="bold" />}
              aria-label="Next day"
            />
          </div>
          <Heading level={2} look="h2">
            {day.title}
          </Heading>
          <DayFacts day={day} />
          <DayBody day={day} />
        </>
      )}
    </div>
  );
}

/** Direction D: trips in the sidebar; the open trip steps through its days. */
export function TripD({ view = "day" }: { view?: "day" | "calendar" }) {
  return (
    <TabView
      label="Trips"
      items={sketchDestinations}
      linkComponent={Link}
      sidebarToggleLabel="Sidebar"
      header={sketchBrand}
    >
      <NavigationSplitView
        linkComponent={Link}
        linkStatus={null}
        sidebar={{
          href: "#trips",
          label: "Trips",
          node: <TripList current={view === "calendar" ? "gb" : "tuscany"} />,
        }}
        content={{
          label: sketchTrip.title,
          back: { href: "#trips", label: "Trips" },
          node: <TripDay view={view} />,
        }}
      />
    </TabView>
  );
}
