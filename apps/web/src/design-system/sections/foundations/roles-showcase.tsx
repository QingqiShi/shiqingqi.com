import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { RoleColumn } from "#src/design-system/role-column.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

type Intent = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

// Neutral leads, as the Intent the rest fall back to.
const INTENT_ORDER: readonly Intent[] = [
  "neutral",
  "accent",
  "info",
  "success",
  "warning",
  "danger",
];

interface IntentSpec {
  /** The column heading, and the first cell's label. */
  name: string;
  labels: {
    hover: string;
    tint: string;
    border: string;
    text: string;
    textOnFill: string;
  };
  tokens: {
    bg: string;
    bgHover: string;
    bgSubtle: string;
    border: string;
    fg: string;
    fgOn: string;
  };
  fills: {
    bg: StyleXStyles;
    bgHover: StyleXStyles;
    bgSubtle: StyleXStyles;
    /** The border tone painted as a fill — the cell matches what it names. */
    border: StyleXStyles;
    /** `fg<Intent>`, read on the canvas and on the tint. */
    fg: StyleXStyles;
    /** `fgOn<Intent>`, read on the solid fill. */
    fgOn: StyleXStyles;
    /** What the border cell's own tone can carry. */
    fgOnBorder: StyleXStyles;
  };
}

export function RolesShowcase() {
  const intents: Record<Intent, IntentSpec> = {
    // The one exception: neutral is the default Intent, so it has no border or
    // foreground token of its own. Its border, tint and text cells read the
    // bare `color.border` and `color.fg` everything else falls back to, and
    // their labels say so.
    neutral: {
      name: t({ en: "Neutral", zh: "中性" }),
      labels: {
        hover: t({ en: "Neutral hover", zh: "中性悬停" }),
        tint: t({ en: "Neutral tint", zh: "中性淡色" }),
        border: t({ en: "Default border", zh: "默认边框" }),
        text: t({ en: "Default text", zh: "默认文字" }),
        textOnFill: t({ en: "Text on neutral", zh: "中性上的文字" }),
      },
      tokens: {
        bg: "color.bgNeutral",
        bgHover: "color.bgNeutralHover",
        bgSubtle: "color.bgNeutralSubtle",
        border: "color.border",
        fg: "color.fg",
        fgOn: "color.fgOnNeutral",
      },
      fills: {
        bg: styles.fillNeutral,
        bgHover: styles.fillNeutralHover,
        bgSubtle: styles.fillNeutralSubtle,
        border: styles.fillBorder,
        fg: styles.fgOnBg,
        fgOn: styles.fgOnNeutral,
        fgOnBorder: styles.fgOnBg,
      },
    },
    accent: {
      name: t({ en: "Accent", zh: "强调" }),
      labels: {
        hover: t({ en: "Accent hover", zh: "强调悬停" }),
        tint: t({ en: "Accent tint", zh: "强调淡色" }),
        border: t({ en: "Accent border", zh: "强调边框" }),
        text: t({ en: "Accent text", zh: "强调文字" }),
        textOnFill: t({ en: "Text on accent", zh: "强调上的文字" }),
      },
      tokens: {
        bg: "color.bgAccent",
        bgHover: "color.bgAccentHover",
        bgSubtle: "color.bgAccentSubtle",
        border: "color.borderAccent",
        fg: "color.fgAccent",
        fgOn: "color.fgOnAccent",
      },
      fills: {
        bg: styles.fillAccent,
        bgHover: styles.fillAccentHover,
        bgSubtle: styles.fillAccentSubtle,
        border: styles.fillAccentBorder,
        fg: styles.fgAccent,
        fgOn: styles.fgOnAccent,
        fgOnBorder: styles.fgOnAccent,
      },
    },
    info: {
      name: t({ en: "Info", zh: "信息" }),
      labels: {
        hover: t({ en: "Info hover", zh: "信息悬停" }),
        tint: t({ en: "Info tint", zh: "信息淡色" }),
        border: t({ en: "Info border", zh: "信息边框" }),
        text: t({ en: "Info text", zh: "信息文字" }),
        textOnFill: t({ en: "Text on info", zh: "信息上的文字" }),
      },
      tokens: {
        bg: "color.bgInfo",
        bgHover: "color.bgInfoHover",
        bgSubtle: "color.bgInfoSubtle",
        border: "color.borderInfo",
        fg: "color.fgInfo",
        fgOn: "color.fgOnInfo",
      },
      fills: {
        bg: styles.fillInfo,
        bgHover: styles.fillInfoHover,
        bgSubtle: styles.fillInfoSubtle,
        border: styles.fillInfoBorder,
        fg: styles.fgInfo,
        fgOn: styles.fgOnInfo,
        fgOnBorder: styles.fgOnInfo,
      },
    },
    success: {
      name: t({ en: "Success", zh: "成功" }),
      labels: {
        hover: t({ en: "Success hover", zh: "成功悬停" }),
        tint: t({ en: "Success tint", zh: "成功淡色" }),
        border: t({ en: "Success border", zh: "成功边框" }),
        text: t({ en: "Success text", zh: "成功文字" }),
        textOnFill: t({ en: "Text on success", zh: "成功上的文字" }),
      },
      tokens: {
        bg: "color.bgSuccess",
        bgHover: "color.bgSuccessHover",
        bgSubtle: "color.bgSuccessSubtle",
        border: "color.borderSuccess",
        fg: "color.fgSuccess",
        fgOn: "color.fgOnSuccess",
      },
      fills: {
        bg: styles.fillSuccess,
        bgHover: styles.fillSuccessHover,
        bgSubtle: styles.fillSuccessSubtle,
        border: styles.fillSuccessBorder,
        fg: styles.fgSuccess,
        fgOn: styles.fgOnSuccess,
        fgOnBorder: styles.fgOnSuccess,
      },
    },
    warning: {
      name: t({ en: "Warning", zh: "警告" }),
      labels: {
        hover: t({ en: "Warning hover", zh: "警告悬停" }),
        tint: t({ en: "Warning tint", zh: "警告淡色" }),
        border: t({ en: "Warning border", zh: "警告边框" }),
        text: t({ en: "Warning text", zh: "警告文字" }),
        textOnFill: t({ en: "Text on warning", zh: "警告上的文字" }),
      },
      tokens: {
        bg: "color.bgWarning",
        bgHover: "color.bgWarningHover",
        bgSubtle: "color.bgWarningSubtle",
        border: "color.borderWarning",
        fg: "color.fgWarning",
        fgOn: "color.fgOnWarning",
      },
      fills: {
        bg: styles.fillWarning,
        bgHover: styles.fillWarningHover,
        bgSubtle: styles.fillWarningSubtle,
        border: styles.fillWarningBorder,
        fg: styles.fgWarning,
        fgOn: styles.fgOnWarning,
        fgOnBorder: styles.fgOnWarning,
      },
    },
    danger: {
      name: t({ en: "Danger", zh: "危险" }),
      labels: {
        hover: t({ en: "Danger hover", zh: "危险悬停" }),
        tint: t({ en: "Danger tint", zh: "危险淡色" }),
        border: t({ en: "Danger border", zh: "危险边框" }),
        text: t({ en: "Danger text", zh: "危险文字" }),
        textOnFill: t({ en: "Text on danger", zh: "危险上的文字" }),
      },
      tokens: {
        bg: "color.bgDanger",
        bgHover: "color.bgDangerHover",
        bgSubtle: "color.bgDangerSubtle",
        border: "color.borderDanger",
        fg: "color.fgDanger",
        fgOn: "color.fgOnDanger",
      },
      fills: {
        bg: styles.fillDanger,
        bgHover: styles.fillDangerHover,
        bgSubtle: styles.fillDangerSubtle,
        border: styles.fillDangerBorder,
        fg: styles.fgDanger,
        fgOn: styles.fgOnDanger,
        fgOnBorder: styles.fgOnDanger,
      },
    },
  };

  return (
    <GuideSection
      title={t({ en: "Intents", zh: "意图色" })}
      lead={t({
        en: "Six Intents carry meaning: accent, info, success, warning, danger and neutral. Pick the one whose job matches yours. The components use them for these jobs and no others, so a custom element that does the same keeps the same meaning.",
        zh: "六种意图色承载含义：accent、info、success、warning、danger 与 neutral。选择用途与你的用途相符的那一种。组件只把它们用于下面这些用途，因此做同样事情的自建元素也保持同样的含义。",
      })}
    >
      <GuideList
        items={[
          {
            term: "accent",
            value: t({
              en: "On, selected, focused, in progress",
              zh: "开启、选中、聚焦、进行中",
            }),
            note: t({
              en: "A checked Checkbox or Switch, the primary Button, an active Chip, a selected OptionCard, the current TableRow, the focus ring, and the fill of Progress and Slider.",
              zh: "已勾选的 Checkbox 或开启的 Switch、主按钮、激活的 Chip、选中的 OptionCard、当前的 TableRow、焦点环，以及 Progress 与 Slider 的填充。",
            }),
          },
          {
            term: "danger",
            value: t({
              en: "Destroys something, or is wrong",
              zh: "会销毁内容，或有错误",
            }),
            note: t({
              en: 'Button look="danger", the edge of a field, Checkbox or Slider with an error, and a field\'s error message.',
              zh: 'Button look="danger"，出错的输入框、Checkbox 或 Slider 的边缘，以及输入框的错误信息。',
            }),
          },
          {
            term: "info · success · warning",
            value: t({ en: "Status only", zh: "仅用于状态" }),
            note: t({
              en: "A Badge or a Callout, together with danger. No control takes these, so a control painted in success or warning means something no component means.",
              zh: "与 danger 一起用于 Badge 或 Callout。没有任何控件使用它们，因此涂成 success 或 warning 的控件，表达的是组件中不存在的含义。",
            }),
          },
          {
            term: "neutral",
            value: t({
              en: "Chrome with no meaning",
              zh: "不带含义的界面元素",
            }),
            note: t({
              en: "The tracks of Progress and Slider, Skeleton, the scrollbar thumb, an unchecked Switch, the subtle Avatar and the neutral Badge.",
              zh: "Progress 与 Slider 的轨道、Skeleton、滚动条滑块、关闭状态的 Switch、subtle 样式的 Avatar，以及中性的 Badge。",
            }),
          },
        ]}
      />

      <GuideList
        items={[
          {
            term: t({ en: "On a solid fill", zh: "实心填充上" }),
            value: "bg<Intent> + fgOn<Intent>",
            note: t({
              en: "A primary button, a checked box, a danger action. The fill is loud, so the text on it takes the token tuned for that fill.",
              zh: "主按钮、已勾选的复选框、危险操作。填充醒目，因此其上的文字使用为该填充调校的令牌。",
            }),
          },
          {
            term: t({ en: "On a tint", zh: "淡色底上" }),
            value: "bg<Intent>Subtle + fg<Intent>",
            note: t({
              en: "A Callout, a tinted Badge, the selected OptionCard. Text that carries the Intent, such as a Badge's label or a Callout's title, takes fg<Intent>. Longer copy on the tint, such as a Callout's body, stays color.fg.",
              zh: "提示框、淡色徽章、选中的 OptionCard。承载意图的文字，例如徽章的标签或提示框的标题，使用 fg<Intent>。淡色上较长的文字，例如提示框的正文，仍用 color.fg。",
            }),
          },
          {
            term: t({ en: "Neutral", zh: "中性" }),
            value: t({ en: "The default Intent", zh: "默认的意图色" }),
            note: t({
              en: "It has a fill, a hover and a tint like the rest, but its text and edge are the plain color.fg and color.border.",
              zh: "它和其他意图色一样有填充、悬停与淡色，但它的文字与边缘就是普通的 color.fg 与 color.border。",
            }),
          },
        ]}
      />
      <DoDont
        do={
          <div css={cluster.tight}>
            <span css={[corner.radius_2, styles.pill, styles.pairFill]}>
              {t({ en: "Fill", zh: "填充" })}
            </span>
            <span css={[corner.radius_2, styles.pill, styles.pairTint]}>
              {t({ en: "Tint", zh: "淡色" })}
            </span>
          </div>
        }
        doCaption={t({
          en: "fgOnAccent on the fill, fgAccent on the tint.",
          zh: "填充上用 fgOnAccent，淡色上用 fgAccent。",
        })}
        dont={
          <div css={cluster.tight}>
            <span css={[corner.radius_2, styles.pill, styles.crossedFill]}>
              {t({ en: "Fill", zh: "填充" })}
            </span>
            <span css={[corner.radius_2, styles.pill, styles.crossedTint]}>
              {t({ en: "Tint", zh: "淡色" })}
            </span>
          </div>
        }
        dontCaption={t({
          en: "The two swapped. Neither pairing has a contrast floor, and both are hard to read.",
          zh: "两者对调。这两种搭配都没有对比度下限的保障，而且都难以辨读。",
        })}
      />
      <UsageSnippet
        code={`import { color } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  danger: {
    backgroundColor: color.bgDanger,
    color: color.fgOnDanger,
  },
  dangerTint: {
    backgroundColor: color.bgDangerSubtle,
    color: color.fgDanger,
  },
});`}
      />
      <GuideNote>
        {t({
          en: "Badge and Callout take an intent prop and pair these for you. Write the tokens yourself only when you build your own element.",
          zh: "Badge 与 Callout 接受 intent 属性，会替你完成搭配。只有自行构建元素时才需要自己写这些令牌。",
        })}
      </GuideNote>

      <Showcase frame="plain" breakout>
        <div css={styles.grid}>
          {INTENT_ORDER.map((intent) => {
            const { name, labels, tokens, fills } = intents[intent];
            return (
              <RoleColumn
                key={intent}
                name={name}
                cells={[
                  {
                    size: "large",
                    bg: fills.bg,
                    fg: fills.fgOn,
                    label: name,
                    token: tokens.bg,
                  },
                  {
                    size: "thin",
                    bg: fills.bgHover,
                    fg: fills.fgOn,
                    label: labels.hover,
                    token: tokens.bgHover,
                  },
                  {
                    size: "medium",
                    bg: fills.bgSubtle,
                    fg: fills.fg,
                    label: labels.tint,
                    token: tokens.bgSubtle,
                  },
                  {
                    size: "thin",
                    bg: fills.border,
                    fg: fills.fgOnBorder,
                    label: labels.border,
                    token: tokens.border,
                  },
                  {
                    size: "thin",
                    bg: styles.fillCanvas,
                    fg: fills.fg,
                    label: labels.text,
                    token: tokens.fg,
                  },
                  {
                    size: "thin",
                    bg: fills.bg,
                    fg: fills.fgOn,
                    label: labels.textOnFill,
                    token: tokens.fgOn,
                  },
                ]}
              />
            );
          })}
        </div>
      </Showcase>
    </GuideSection>
  );
}

const styles = stylex.create({
  pill: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._1,
    paddingInline: space._3,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
  },
  pairFill: { backgroundColor: color.bgAccent, color: color.fgOnAccent },
  pairTint: { backgroundColor: color.bgAccentSubtle, color: color.fgAccent },
  crossedFill: { backgroundColor: color.bgAccent, color: color.fgAccent },
  crossedTint: {
    backgroundColor: color.bgAccentSubtle,
    color: color.fgOnAccent,
  },
  grid: {
    display: "grid",
    // 6 Intents divide cleanly as 1×6, 2×3, or 6×1 — those breakpoints avoid orphans.
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(6, minmax(0, 1fr))",
    },
    // Auto-sized rows so the subgrid children share a row track per cell index.
    gridAutoRows: "auto",
    gap: rhythm.item,
  },

  // Fill helpers. The text row shows each Intent's text token as text on the
  // canvas it is read on, not as a fill. A border cell is painted as a fill
  // too: an Intent's border is its fill tone, and the cell says so by matching.
  fillCanvas: { backgroundColor: color.bgCanvas },
  fillBorder: { backgroundColor: color.border },
  fillNeutral: { backgroundColor: color.bgNeutral },
  fillNeutralHover: { backgroundColor: color.bgNeutralHover },
  fillNeutralSubtle: { backgroundColor: color.bgNeutralSubtle },
  fillAccent: { backgroundColor: color.bgAccent },
  fillAccentHover: { backgroundColor: color.bgAccentHover },
  fillAccentSubtle: { backgroundColor: color.bgAccentSubtle },
  fillAccentBorder: { backgroundColor: color.borderAccent },
  fillInfo: { backgroundColor: color.bgInfo },
  fillInfoHover: { backgroundColor: color.bgInfoHover },
  fillInfoSubtle: { backgroundColor: color.bgInfoSubtle },
  fillInfoBorder: { backgroundColor: color.borderInfo },
  fillSuccess: { backgroundColor: color.bgSuccess },
  fillSuccessHover: { backgroundColor: color.bgSuccessHover },
  fillSuccessSubtle: { backgroundColor: color.bgSuccessSubtle },
  fillSuccessBorder: { backgroundColor: color.borderSuccess },
  fillWarning: { backgroundColor: color.bgWarning },
  fillWarningHover: { backgroundColor: color.bgWarningHover },
  fillWarningSubtle: { backgroundColor: color.bgWarningSubtle },
  fillWarningBorder: { backgroundColor: color.borderWarning },
  fillDanger: { backgroundColor: color.bgDanger },
  fillDangerHover: { backgroundColor: color.bgDangerHover },
  fillDangerSubtle: { backgroundColor: color.bgDangerSubtle },
  fillDangerBorder: { backgroundColor: color.borderDanger },

  // Foreground helpers
  fgOnBg: { color: color.fg },
  fgOnNeutral: { color: color.fgOnNeutral },
  fgAccent: { color: color.fgAccent },
  fgOnAccent: { color: color.fgOnAccent },
  fgInfo: { color: color.fgInfo },
  fgOnInfo: { color: color.fgOnInfo },
  fgSuccess: { color: color.fgSuccess },
  fgOnSuccess: { color: color.fgOnSuccess },
  fgWarning: { color: color.fgWarning },
  fgOnWarning: { color: color.fgOnWarning },
  fgDanger: { color: color.fgDanger },
  fgOnDanger: { color: color.fgOnDanger },
});
