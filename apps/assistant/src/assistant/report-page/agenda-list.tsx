import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { AgendaItem } from "../report/types.ts";

/** The `HH:mm` of a `YYYY-MM-DDTHH:mm`. */
function clockOf(localTime: string | null) {
  return localTime && localTime.length > 10 ? localTime.slice(11, 16) : null;
}

/** The place an IANA zone names, such as "Tokyo" for Asia/Tokyo. */
function placeOf(timeZone: string) {
  return timeZone.slice(timeZone.lastIndexOf("/") + 1).replaceAll("_", " ");
}

/** Today's events, each with its time, place and what the mail says of it. */
export function AgendaList({ items }: { items: readonly AgendaItem[] }) {
  const allDay = t({ en: "All day", zh: "全天" });
  return (
    <ul css={[stack.rows, styles.list]}>
      {items.map((item, index) => {
        const start = clockOf(item.start);
        const end = clockOf(item.end);
        return (
          <li key={index} css={styles.item}>
            <span css={[typeRole.label, typeModifier.numeric, styles.time]}>
              {item.allDay || !start ? (
                allDay
              ) : (
                <>
                  {end && end !== start ? `${start}–${end}` : start}
                  {item.timeZone ? (
                    <span css={[typeRole.caption, styles.zone]}>
                      {placeOf(item.timeZone)}
                    </span>
                  ) : null}
                </>
              )}
            </span>
            <div css={stack.text}>
              <Text as="p" weight="medium">
                {item.title}
              </Text>
              {item.location ? (
                <Text as="p" look="bodySmall" tone="muted">
                  {item.location}
                </Text>
              ) : null}
              {item.note ? (
                <Text as="p" look="bodySmall" tone="accent">
                  {item.note}
                </Text>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const styles = stylex.create({
  list: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  item: {
    display: "grid",
    gridTemplateColumns: "6.5rem minmax(0, 1fr)",
    columnGap: rhythm.item,
    alignItems: "baseline",
    paddingBlock: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  time: {
    display: "flex",
    flexDirection: "column",
  },
  zone: {
    color: color.fgMuted,
  },
});
