import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
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
    <List>
      {items.map((item, index) => {
        const start = clockOf(item.start);
        const end = clockOf(item.end);
        return (
          <li key={index} css={listSurface.item}>
            <div css={[listSurface.row, styles.row]}>
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
                  <Text as="p" look="bodySmall" tone="muted">
                    {item.note}
                  </Text>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </List>
  );
}

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "6.5rem minmax(0, 1fr)",
    columnGap: rhythm.item,
    alignItems: "baseline",
    paddingBlock: space._2,
  },
  time: {
    display: "flex",
    flexDirection: "column",
    color: color.fg,
  },
  zone: {
    color: color.fgMuted,
  },
});
