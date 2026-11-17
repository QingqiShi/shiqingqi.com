"use client";

import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { ReorderList, useReorderItem } from "@tuja/ui/components/reorder-list";
import { Text } from "@tuja/ui/components/text";
import { justify } from "@tuja/ui/primitives/flex.stylex";
import { useState } from "react";
import { ClientExample as Example } from "#src/design-system/client-example.tsx";

function PlanRow({ id, title }: { id: string; title: string }) {
  const { ref, css, handle } = useReorderItem(id, title);
  return (
    <li ref={ref} css={[listSurface.item, css]}>
      <div css={[listSurface.row, justify.between]}>
        <Text as="span">{title}</Text>
        {handle}
      </div>
    </li>
  );
}

function DayPlan() {
  const [plan, setPlan] = useState([
    "tram",
    "market",
    "tiles",
    "sunset",
    "train",
  ]);
  const titles: Record<string, string> = {
    tram: t({ en: "Tram 28 to Alfama", zh: "乘 28 路电车去阿尔法玛" }),
    market: t({ en: "Lunch at the market", zh: "在市场吃午饭" }),
    tiles: t({ en: "Tile museum", zh: "瓷砖博物馆" }),
    sunset: t({ en: "Sunset at the viewpoint", zh: "在观景台看日落" }),
    train: t({ en: "Night train to Porto", zh: "乘夜车去波尔图" }),
  };
  const move = t({ en: "Move {title}", zh: "移动 {title}" });
  const movedTo = t({
    en: "{title}: place {place} of {count}",
    zh: "{title}：第 {place} 项，共 {count} 项",
  });
  return (
    <ReorderList
      ids={plan}
      fixed={["train"]}
      handleLabel={(title) => move.replace("{title}", title)}
      movedLabel={(title, place, count) =>
        movedTo
          .replace("{title}", title)
          .replace("{place}", String(place))
          .replace("{count}", String(count))
      }
      onMove={(from, to) => {
        setPlan(plan.toSpliced(from, 1).toSpliced(to, 0, plan[from]));
      }}
    >
      <List>
        {plan.map((id) => (
          <PlanRow key={id} id={id} title={titles[id] ?? id} />
        ))}
      </List>
    </ReorderList>
  );
}

/** A day of a trip, whose stops move and whose train keeps its place. */
export function ReorderListExample() {
  return (
    <Example fill>
      <DayPlan />
    </Example>
  );
}
