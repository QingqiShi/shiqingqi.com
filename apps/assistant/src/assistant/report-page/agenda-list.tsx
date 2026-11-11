import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
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
export function AgendaList({
  items,
  form,
}: {
  items: readonly AgendaItem[];
  /** See `List`. */
  form?: "card" | "plain";
}) {
  const allDay = t({ en: "All day", zh: "全天" });
  return (
    <List form={form}>
      {items.map((item, index) => {
        const start = clockOf(item.start);
        const end = clockOf(item.end);
        return (
          <ListRow
            key={index}
            wrap
            leading={
              <Text as="span" look="label" numeric css={styles.time}>
                {item.allDay || !start ? (
                  allDay
                ) : (
                  <>
                    {end && end !== start ? `${start}–${end}` : start}
                    {item.timeZone ? (
                      <Text as="span" look="caption" tone="muted">
                        {placeOf(item.timeZone)}
                      </Text>
                    ) : null}
                  </>
                )}
              </Text>
            }
            detail={item.location}
            extra={item.note}
          >
            {item.title}
          </ListRow>
        );
      })}
    </List>
  );
}

const styles = stylex.create({
  time: {
    display: "flex",
    flexDirection: "column",
    inlineSize: "6.5rem",
  },
});
