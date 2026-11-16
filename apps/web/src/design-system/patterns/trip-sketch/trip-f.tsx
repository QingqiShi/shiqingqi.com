"use client";

import { Link } from "@tuja/next-links/link";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { TabView } from "@tuja/ui/components/tab-view";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { TripList } from "./sketch-parts";
import {
  CURRENT_DAY,
  itemRows,
  sketchBrand,
  sketchDestinations,
  sketchTrip,
} from "./sketch-shared";
import { TripOverview } from "./trip-e";

function TodayCard() {
  const day = sketchTrip.days[CURRENT_DAY];
  const next = day.moments[1];
  return (
    <Card>
      <div css={stack.item}>
        <Text look="overline" tone="muted">
          {`Today · Day ${CURRENT_DAY} · next at ${next.time}`}
        </Text>
        <Heading level={2} look="h3">
          {next.text}
        </Heading>
        <MetaLine facts={[day.weather?.temp, day.weather?.summary]} />
        <List form="plain">{itemRows(next.items)}</List>
      </div>
    </Card>
  );
}

function TripHome() {
  return (
    <div css={stack.group}>
      <TodayCard />
      <TripOverview />
    </div>
  );
}

/** Direction F: trips in the sidebar; the trip opens on today, and a day opens over the trip. */
export function TripF() {
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
        sidebar={{ href: "#trips", label: "Trips", node: <TripList /> }}
        content={{
          label: sketchTrip.title,
          back: { href: "#trips", label: "Trips" },
          node: <TripHome />,
        }}
      />
    </TabView>
  );
}
