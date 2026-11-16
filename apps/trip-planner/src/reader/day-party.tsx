"use client";

import { AirplaneLandingIcon } from "@phosphor-icons/react/dist/ssr/AirplaneLanding";
import { AirplaneTakeoffIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTakeoff";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { UserMinusIcon } from "@phosphor-icons/react/dist/ssr/UserMinus";
import { UserPlusIcon } from "@phosphor-icons/react/dist/ssr/UserPlus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { PresenceKind, TravelVia } from "#src/trips/types.ts";
import type { DayPresence } from "#src/trips/types.ts";
import { useTripLang } from "./trip-text.tsx";

function PersonAvatar({ person }: { person: DayPresence }) {
  const verbs = {
    arrive: t({ en: "arrives", zh: "抵达" }),
    depart: t({ en: "leaves", zh: "离开" }),
    home: t({ en: "goes home", zh: "回家" }),
  };
  if (person.kind === "present") {
    return (
      <Avatar name={person.name} initials={person.initial} look="subtle" />
    );
  }
  return (
    <Avatar
      name={person.name}
      initials={person.initial}
      look="solid"
      badge={presenceIcon[`${person.kind}-${person.via}`]}
      badgeLabel={verbs[person.kind]}
    />
  );
}

/**
 * Who is on the day. A person who arrives, leaves or goes home that day shows
 * solid, with a badge for how, so the comings and goings stand out.
 */
export function DayParty({ people }: { people: DayPresence[] }) {
  const lang = useTripLang();
  if (people.length === 0) return null;

  return (
    <ul css={[cluster.item, styles.list]}>
      {people.map((person) => (
        <li key={person.id} css={styles.person}>
          <PersonAvatar person={person} />
          <span aria-hidden lang={lang}>
            <Text
              as="span"
              look="caption"
              tone={person.kind === "present" ? "muted" : "default"}
            >
              {person.name}
            </Text>
          </span>
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  person: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.inline,
  },
});

/** The badge on a person's avatar on a day they arrive, leave or go home. */
const presenceIcon: Record<
  `${Exclude<PresenceKind, "present">}-${TravelVia}`,
  ReactNode
> = {
  "arrive-air": <AirplaneLandingIcon weight="bold" />,
  "arrive-ground": <UserPlusIcon weight="bold" />,
  "depart-air": <AirplaneTakeoffIcon weight="bold" />,
  "depart-ground": <UserMinusIcon weight="bold" />,
  "home-air": <HouseIcon weight="bold" />,
  "home-ground": <HouseIcon weight="bold" />,
};
