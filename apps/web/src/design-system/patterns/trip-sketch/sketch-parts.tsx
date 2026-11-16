"use client";

import { CarIcon } from "@phosphor-icons/react/dist/ssr/Car";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { Section } from "@tuja/ui/components/section";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import {
  itemRows,
  momentTips,
  SKETCH_TRIPS,
  type SketchDay,
  stayIcon,
  timeLabel,
  TipCallout,
} from "./sketch-shared";

export function TripList({ current = "tuscany" }: { current?: string }) {
  return (
    <nav aria-label="Trips">
      <NavList>
        <NavGroup label="Upcoming">
          {SKETCH_TRIPS.map((trip) => (
            <NavLink
              key={trip.id}
              href={`#${trip.id}`}
              current={trip.id === current}
              trailing={
                trip.id === current && trip.badge ? (
                  <Badge size="sm">{trip.badge}</Badge>
                ) : (
                  <Text as="span" look="caption" tone="muted">
                    {trip.dates}
                  </Text>
                )
              }
            >
              {trip.title}
            </NavLink>
          ))}
          <NavLink href="#new" icon={<PlusIcon weight="bold" />}>
            New trip
          </NavLink>
        </NavGroup>
      </NavList>
    </nav>
  );
}

export function DayFacts({ day }: { day: SketchDay }) {
  return (
    <StatGroup>
      <Stat
        label="Weather"
        value={day.weather?.temp}
        detail={day.weather?.summary}
        icon={<SunIcon weight="bold" />}
      />
      <Stat
        label="Driving"
        value={day.driving?.replace(" 自驾", "")}
        detail={day.route}
        icon={<CarIcon weight="bold" />}
      />
      <Stat
        label="Tonight"
        value={day.stay.summary.replace(/（.*）/, "")}
        detail={day.stay.note}
        icon={stayIcon}
      />
    </StatGroup>
  );
}

export function DayBody({ day }: { day: SketchDay }) {
  return (
    <>
      {day.moments.map((moment) => {
        const rows = itemRows(moment.items);
        return (
          <Section key={moment.id} title={timeLabel(moment.time)} look="label">
            <div css={stack.item}>
              {moment.text ? <Text>{moment.text}</Text> : null}
              {rows.length > 0 ? <List>{rows}</List> : null}
              {momentTips(moment.items).map((tip) => (
                <TipCallout key={tip.id} tip={tip} />
              ))}
            </div>
          </Section>
        );
      })}
      {day.tips.length > 0 ? (
        <Section title="Good to know" look="label">
          <div css={stack.item}>
            {day.tips.map((tip) => (
              <TipCallout key={tip.id} tip={tip} />
            ))}
          </div>
        </Section>
      ) : null}
      <Section title="Stay" look="label">
        <List>
          <ListRow href="#stay" leading={stayIcon} detail={day.stay.note} wrap>
            {day.stay.summary}
          </ListRow>
        </List>
      </Section>
    </>
  );
}
