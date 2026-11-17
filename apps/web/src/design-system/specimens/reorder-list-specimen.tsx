"use client";

import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { ReorderList, useReorderItem } from "@tuja/ui/components/reorder-list";
import { Text } from "@tuja/ui/components/text";
import { justify } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";

function Row({ id, title }: { id: string; title: string }) {
  const { ref, css, handle } = useReorderItem(id, title);
  return (
    <li ref={ref} css={[listSurface.item, css]}>
      <div css={[listSurface.row, justify.between]}>
        <Text as="span" look="bodySmall">
          {title}
        </Text>
        {handle}
      </div>
    </li>
  );
}

/** Two stops of a day, each with its handle. The tile is `inert`, so nothing moves. */
export function ReorderListSpecimen() {
  const stops = [
    { id: "tram", title: t({ en: "Tram to Alfama", zh: "电车去阿尔法玛" }) },
    {
      id: "market",
      title: t({ en: "Lunch at the market", zh: "在市场吃午饭" }),
    },
  ];
  return (
    <ReorderList
      ids={stops.map((stop) => stop.id)}
      handleLabel={(title) => title}
      movedLabel={(title) => title}
      onMove={() => undefined}
    >
      <List css={fill.inline}>
        {stops.map((stop) => (
          <Row key={stop.id} id={stop.id} title={stop.title} />
        ))}
      </List>
    </ReorderList>
  );
}
