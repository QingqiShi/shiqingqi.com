import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { gridlineGround } from "#src/design-system/gridline-ground.stylex.ts";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

/**
 * The foreground tokens: which one carries which text, the two levels drawn
 * on the canvas and on a surface, and the code.
 */
export function TextRolesShowcase() {
  return (
    <GuideSection
      title={t({ en: "Foregrounds", zh: "前景色" })}
      lead={t({
        en: "Two levels carry every word on a canvas, a surface or a control. A ground that needs a foreground of its own names it with fgOn.",
        zh: "画布、表面与控件上的所有文字由两个层级承担。需要专属前景色的底面，用 fgOn 指明它。",
      })}
    >
      <GuideList
        items={[
          {
            term: "color.fg",
            value: t({
              en: "Headings and body copy",
              zh: "标题与正文",
            }),
            note: t({
              en: "The default. The root sets it, so most text inherits it without naming it.",
              zh: "默认值。根元素已设置它，因此大多数文字无需指明即可继承。",
            }),
          },
          {
            term: "color.fgMuted",
            value: t({
              en: "Supporting copy",
              zh: "辅助文案",
            }),
            note: t({
              en: "Captions, field hints, table headers, metadata. Still held to a contrast floor, so it is safe for text a reader needs. A quiet control, such as a ghost Button or a Breadcrumb link, rests at fgMuted and turns fg on hover.",
              zh: "说明、字段提示、表头、元信息。它同样遵守对比度下限，因此读者需要读的文字也可以用它。安静的控件，例如 ghost 样式的 Button 或 Breadcrumb 链接，静止时为 fgMuted，悬停时变为 fg。",
            }),
          },
          {
            term: "color.fg<Intent>",
            value: t({
              en: "Text in an Intent's colour",
              zh: "意图色的文字",
            }),
            note: t({
              en: "On the page or on that Intent's tint: a field error in fgDanger, a tinted Badge's label.",
              zh: "用于页面上或该意图色的淡色底上：fgDanger 的字段错误、淡色徽章的标签。",
            }),
          },
          {
            term: "color.fgOn<X>",
            value: t({
              en: "Text on a ground of its own",
              zh: "专属底面上的文字",
            }),
            note: t({
              en: "On bgControlBright, bgInverse, bgScrim, and every solid Intent fill. Never fg or fgMuted there.",
              zh: "用于 bgControlBright、bgInverse、bgScrim 与每一种实心意图色填充之上。这些底面上不要用 fg 或 fgMuted。",
            }),
          },
        ]}
      />
      <div css={[gridlineGround.base, styles.grid]}>
        <GroundCell
          name={t({ en: "Canvas", zh: "画布" })}
          fill={styles.fillCanvas}
        />
        <GroundCell
          name={t({ en: "Surface", zh: "表面" })}
          fill={styles.fillSurface}
        />
      </div>
      <UsageSnippet
        code={`import { color } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  caption: { color: color.fgMuted },
  error: { color: color.fgDanger },
});`}
      />
      <GuideNote>
        {t({
          en: 'With a component you name none of these: Text takes tone="muted" or tone="accent", and a Badge or Callout pairs the tokens for its intent.',
          zh: '使用组件时无需指明这些令牌：Text 接受 tone="muted" 或 tone="accent"，Badge 与 Callout 会按其 intent 自行搭配令牌。',
        })}
      </GuideNote>
    </GuideSection>
  );
}

function GroundCell({ name, fill }: { name: string; fill: StyleXStyles }) {
  return (
    <div css={[styles.cell, fill]}>
      <span css={styles.ground}>{name}</span>
      <div css={styles.roles}>
        <TextLevel
          token="color.fg"
          levelStyle={styles.levelDefault}
          sample={t({
            en: "Arrival — a linguist is asked to talk to visitors.",
            zh: "《降临》——一位语言学家受邀与来客对话。",
          })}
        />
        <TextLevel
          token="color.fgMuted"
          levelStyle={styles.levelMuted}
          sample={t({
            en: "2016 · 116 min · Denis Villeneuve",
            zh: "2016 · 116 分钟 · 丹尼斯·维伦纽瓦",
          })}
        />
      </div>
    </div>
  );
}

interface TextLevelProps {
  token: string;
  sample: string;
  levelStyle: StyleXStyles;
}

function TextLevel({ token, sample, levelStyle }: TextLevelProps) {
  return (
    <div css={styles.level}>
      <span css={[styles.sample, levelStyle]}>{sample}</span>
      <span css={[styles.token, levelStyle]}>{token}</span>
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._00,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    paddingBlock: space._4,
    paddingInline: space._4,
    minInlineSize: 0,
  },
  fillCanvas: { backgroundColor: color.bgCanvas },
  fillSurface: { backgroundColor: color.bgSurface },
  ground: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    color: color.fg,
  },
  roles: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  level: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  sample: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_3,
    textWrap: "pretty",
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_2,
    overflowWrap: "anywhere",
  },
  levelDefault: { color: color.fg },
  levelMuted: { color: color.fgMuted },
});
