import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, measure, rhythm } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

interface RoleRow {
  name:
    | "display"
    | "subDisplay"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "body"
    | "bodySmall"
    | "label"
    | "caption"
    | "overline";
  /** The size and the line height, as this page renders them. */
  metrics: string;
  sample: string;
}

/** The static type roles, each set at its real size in a line of the copy it is for. */
export function TypeRolesShowcase() {
  const rows: RoleRow[] = [
    {
      name: "display",
      metrics: t({ en: "3rem / 0.98", zh: "3rem / 1.1" }),
      sample: t({ en: "Kyoto in four days", zh: "京都四日游" }),
    },
    {
      name: "subDisplay",
      metrics: t({ en: "2rem / 0.98", zh: "2rem / 1.1" }),
      sample: t({ en: "Day one in Higashiyama", zh: "第一天：东山" }),
    },
    {
      name: "h1",
      metrics: t({ en: "1.5rem / 1.24", zh: "1.5rem / 1.2" }),
      sample: t({ en: "Where to stay", zh: "住在哪里" }),
    },
    {
      name: "h2",
      metrics: t({ en: "1.25rem / 1.24", zh: "1.25rem / 1.2" }),
      sample: t({ en: "Inns near Gion", zh: "祇园附近的旅馆" }),
    },
    {
      name: "h3",
      metrics: t({ en: "1.1rem / 1.24", zh: "1.1rem / 1.2" }),
      sample: t({ en: "Check-in and check-out", zh: "入住与退房" }),
    },
    {
      name: "h4",
      metrics: t({ en: "1rem / 1.24", zh: "1rem / 1.2" }),
      sample: t({ en: "Breakfast", zh: "早餐" }),
    },
    {
      name: "body",
      metrics: t({ en: "1rem / 1.5", zh: "1rem / 1.7" }),
      sample: t({
        en: "Trains leave Kyoto Station every ten minutes.",
        zh: "列车每十分钟从京都站发出一班。",
      }),
    },
    {
      name: "bodySmall",
      metrics: t({ en: "0.85rem / 1.5", zh: "0.85rem / 1.7" }),
      sample: t({ en: "Prices include tax.", zh: "价格已含税。" }),
    },
    {
      name: "label",
      metrics: "0.85rem / 1.3",
      sample: t({ en: "Departure time", zh: "出发时间" }),
    },
    {
      name: "caption",
      metrics: "0.75rem / 1.3",
      sample: t({ en: "Updated 3 hours ago", zh: "3 小时前更新" }),
    },
    {
      name: "overline",
      metrics: "0.85rem / 1.3",
      sample: t({ en: "Day 2", zh: "第 2 天" }),
    },
  ];

  return (
    <GuideSection
      title={t({
        en: "Pick a role by the job of the text.",
        zh: "按文字的用途选字体角色。",
      })}
      lead={t({
        en: "A role sets the size, line height, weight and tracking together. Every size is in rem, so it follows the font size a reader sets in the browser.",
        zh: "字体角色同时设定字号、行高、字重与字距。所有字号都以 rem 为单位，因此会跟随读者在浏览器中设置的字号。",
      })}
    >
      <ol css={[stack.item, styles.ramp]}>
        {rows.map((row) => (
          <li key={row.name} css={styles.row}>
            <span css={[typeRole.caption, styles.meta]}>
              <span css={styles.name}>{row.name}</span>{" "}
              <span css={[typeModifier.numeric, styles.metrics]}>
                {row.metrics}
              </span>
            </span>
            <span css={[typeRole[row.name], styles.sample]}>{row.sample}</span>
          </li>
        ))}
      </ol>
      <div css={stack.tight}>
        <GuideNote>
          {t({
            en: "Chinese text takes its own line heights, so these figures change with it.",
            zh: "中文使用自己的行高，因此这些数值随之而变。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "In a control, use control or controlCaption, which are larger below md.",
            zh: "控件内使用 control 或 controlCaption，它们在 md 以下更大。",
          })}
        </GuideNote>
      </div>
    </GuideSection>
  );
}

const styles = stylex.create({
  ramp: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 36rem)": "12rem minmax(0, 1fr)",
    },
    alignItems: "baseline",
    columnGap: rhythm.item,
    rowGap: rhythm.inline,
  },
  meta: {
    minInlineSize: 0,
    fontFamily: font.familyMono,
  },
  name: {
    color: color.fg,
  },
  metrics: {
    color: color.fgMuted,
  },
  sample: {
    minInlineSize: 0,
    maxInlineSize: measure.prose,
    color: color.fg,
  },
});
