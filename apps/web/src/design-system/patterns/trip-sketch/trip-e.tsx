"use client";

import { Link } from "@tuja/next-links/link";
import { Badge } from "@tuja/ui/components/badge";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { TabView } from "@tuja/ui/components/tab-view";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { DayBody, DayFacts, TripList } from "./sketch-parts";
import {
  CURRENT_DAY,
  dayDate,
  sketchBrand,
  sketchDestinations,
  sketchTrip,
} from "./sketch-shared";

export function TripOverview({ withStats = true }: { withStats?: boolean }) {
  return (
    <div css={stack.group}>
      <PageHeader
        eyebrow={`11–15 Jun · ${sketchTrip.party}`}
        title={sketchTrip.title}
        description={sketchTrip.subtitle}
      />
      {withStats ? (
        <StatGroup>
          <Stat label="Days" value="5" detail="Thu 11 – Mon 15 Jun" />
          <Stat label="Driving" value="≈ 19h" detail="Pisa loop" />
          <Stat label="Stays" value="2" detail="Villa Vignacce, Siena" />
        </StatGroup>
      ) : null}
      <List>
        {sketchTrip.days.map((day, i) => (
          <ListRow
            key={day.id}
            href={`#${day.id}`}
            wrap
            detail={<MetaLine facts={[dayDate(day), day.route]} />}
            value={i === CURRENT_DAY ? <Badge size="sm">Today</Badge> : null}
          >
            {`D${i} · ${day.title}`}
          </ListRow>
        ))}
      </List>
    </div>
  );
}

function DayDetail() {
  const day = sketchTrip.days[CURRENT_DAY];
  return (
    <div css={stack.group}>
      <Heading level={2} look="h2">
        {`Day ${CURRENT_DAY} · ${dayDate(day)}`}
      </Heading>
      <DayFacts day={day} />
      <DayBody day={day} />
    </div>
  );
}

/** Direction E: trips in the sidebar, the trip's days in the middle, the day beside them. */
export function TripE() {
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
          node: <TripOverview withStats={false} />,
        }}
        detail={{
          label: `Day ${CURRENT_DAY}`,
          back: { href: "#trip", label: sketchTrip.title },
          closeLabel: "Close day",
          node: <DayDetail />,
        }}
      />
    </TabView>
  );
}
