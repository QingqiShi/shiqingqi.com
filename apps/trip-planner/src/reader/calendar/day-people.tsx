"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { DayPresence } from "#src/trips/types.ts";
import { useTripLang } from "../trip-text.tsx";

/**
 * Who is on the day, as a row of faces. A person who arrives or leaves that
 * day shows solid, and is named beside the row.
 */
export function DayPeople({ people }: { people: DayPresence[] }) {
  const lang = useTripLang();
  const arrives = t({ en: "Arrives: {names}", zh: "抵达：{names}" });
  const leaves = t({ en: "Leaves: {names}", zh: "离开：{names}" });
  if (people.length === 0) return null;
  const names = (kinds: DayPresence["kind"][]) =>
    people
      .filter((person) => kinds.includes(person.kind))
      .map((person) => person.name)
      .join(", ");
  const marks = [
    { sign: "+", names: names(["arrive"]), label: arrives },
    { sign: "−", names: names(["depart", "home"]), label: leaves },
  ].filter((mark) => mark.names !== "");

  return (
    <span css={cluster.inline}>
      <span css={styles.faces}>
        {people.map((person) => (
          <Avatar
            key={person.id}
            name={person.name}
            initials={person.initial}
            size="sm"
            look={person.kind === "present" ? "subtle" : "solid"}
            css={styles.face}
          />
        ))}
      </span>
      {marks.map((mark) => (
        <Text key={mark.sign} as="span" look="caption" tone="muted">
          <span aria-hidden lang={lang}>{`${mark.sign} ${mark.names}`}</span>
          <span css={a11y.srOnly} lang={lang}>
            {mark.label.replace("{names}", mark.names)}
          </span>
        </Text>
      ))}
    </span>
  );
}

const styles = stylex.create({
  faces: { display: "inline-flex", paddingInlineStart: space._0 },
  face: { marginInlineStart: `calc(-1 * ${space._0})` },
});
