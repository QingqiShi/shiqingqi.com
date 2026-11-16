"use client";

import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CarIcon } from "@phosphor-icons/react/dist/ssr/Car";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { TrainSimpleIcon } from "@phosphor-icons/react/dist/ssr/TrainSimple";
import { UserMinusIcon } from "@phosphor-icons/react/dist/ssr/UserMinus";
import { UserPlusIcon } from "@phosphor-icons/react/dist/ssr/UserPlus";
import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Section } from "@tuja/ui/components/section";
import type { ReactNode } from "react";
import type { HighlightKind } from "#src/trips/types.ts";
import type { DayHighlight } from "./day-highlights.ts";
import { DirectionsButton } from "./directions-button.tsx";
import { TripText } from "./trip-text.tsx";
import { useTimeLabel } from "./use-time-label.ts";

/** The day's fixed commitments: where to be, and when. A row jumps to its
 *  moment below, and its button opens the directions. */
export function DayGlance({
  highlights,
  onJump,
}: {
  highlights: DayHighlight[];
  onJump: (momentId: string) => void;
}) {
  const timeLabel = useTimeLabel();

  return (
    <Section title={t({ en: "At a glance", zh: "今日要点" })} look="label">
      <List>
        {highlights.map((highlight) => {
          const shared = {
            leading: highlightIcon[highlight.kind],
            leadingShape: "circle" as const,
            detail: timeLabel(highlight.time),
            wrap: true,
            actions: highlight.query ? (
              <DirectionsButton
                destination={highlight.query}
                mode={highlight.mode}
              />
            ) : undefined,
          };
          return highlight.inFeed ? (
            <ListRow
              key={highlight.momentId}
              {...shared}
              onClick={() => {
                onJump(highlight.momentId);
              }}
            >
              <TripText>{highlight.label}</TripText>
            </ListRow>
          ) : (
            <ListRow key={highlight.momentId} {...shared}>
              <TripText>{highlight.label}</TripText>
            </ListRow>
          );
        })}
      </List>
    </Section>
  );
}

const highlightIcon: Record<HighlightKind, ReactNode> = {
  flight: <AirplaneTiltIcon weight="bold" />,
  pickup: <UserPlusIcon weight="bold" />,
  dropoff: <UserMinusIcon weight="bold" />,
  checkin: <BedIcon weight="bold" />,
  checkout: <SignOutIcon weight="bold" />,
  reservation: <ForkKnifeIcon weight="bold" />,
  transit: <TrainSimpleIcon weight="bold" />,
  drive: <CarIcon weight="bold" />,
};
