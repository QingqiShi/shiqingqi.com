"use client";

import * as stylex from "@stylexjs/stylex";
import { List } from "@tuja/ui/components/list";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId } from "react";
import { DiningList } from "#src/reader/dining-list.tsx";
import { NavLegRow } from "#src/reader/maps/nav-leg-row.tsx";
import { PlaceRows } from "#src/reader/place-list.tsx";
import { MomentTime } from "#src/reader/quick-edit/moment-time.tsx";
import { TipCallout } from "#src/reader/tip-callout.tsx";
import { TripText } from "#src/reader/trip-text.tsx";
import type { Day } from "#src/trips/types.ts";
import { type DayMoment, buildDayFeed } from "./build-day-feed.ts";
import { ChecklistCard } from "./checklist-card.tsx";
import { FlightCard } from "./flight-card.tsx";
import { momentDomId } from "./moment-dom-id.ts";
import { SignSheetCard } from "./sign-sheet-card.tsx";

function MomentSection({
  moment,
  tripId,
}: {
  moment: DayMoment;
  tripId: string | null;
}) {
  const timeId = useId();
  return (
    <Section
      id={momentDomId(moment.id)}
      title={<MomentTime id={moment.id} time={moment.time} textId={timeId} />}
      titleLabelledBy={timeId}
      look="label"
      css={styles.moment}
    >
      <div css={stack.item}>
        {moment.text === undefined ? null : (
          <Text>
            <TripText>{moment.text}</TripText>
          </Text>
        )}
        {moment.flights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
        {moment.checklists.map((list) => (
          <ChecklistCard key={list.id} tripId={tripId} list={list} />
        ))}
        {moment.signSheets.map((sheet) => (
          <SignSheetCard key={sheet.id} sheet={sheet} />
        ))}
        {moment.nav.length > 0 ? (
          <List>
            {moment.nav.map((leg) => (
              <NavLegRow key={leg.id} leg={leg} />
            ))}
          </List>
        ) : null}
        {moment.dining.length > 0 ? (
          <DiningList restaurants={moment.dining} />
        ) : null}
        {moment.places.length > 0 ? <PlaceRows places={moment.places} /> : null}
        {moment.tips.map((tip) => (
          <TipCallout key={tip.id} tip={tip} />
        ))}
      </div>
    </Section>
  );
}

/**
 * On a phone, scrolls today to the moment that is on now, so that it is in
 * view at once. On a wider screen the day mostly fits.
 */
/**
 * The day in time order: each moment with its flights, lists, routes, places
 * to eat and go, and heads-ups.
 */
export function DayFeed({ tripId, day }: { tripId: string | null; day: Day }) {
  const moments = buildDayFeed(day);

  return (
    <>
      {moments.map((moment) => (
        <MomentSection key={moment.id} moment={moment} tripId={tripId} />
      ))}
    </>
  );
}

const styles = stylex.create({
  // Clears the bar with the back link that stays at the top on a phone.
  moment: {
    scrollMarginTop: "4rem",
  },
});
