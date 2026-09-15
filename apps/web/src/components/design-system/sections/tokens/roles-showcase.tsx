import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { RoleColumn } from "../../role-column.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

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
    <Showcase label={t({ en: "Intents", zh: "意图色" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "Six Intents, each with the same six tokens: a solid fill and its hover, a tint, a border in the fill's own tone, a foreground on its own, and a foreground on the fill. On a solid fill use fgOn<Intent>; on a tint use fg<Intent>. Neutral is the default Intent, so its border and foreground are the bare color.border and color.fg everything else falls back to.",
          zh: "六种意图色，每一种都有同样的六个令牌：实心填充与其悬停态、淡色、与填充同色调的边框、单独使用的前景色，以及填充之上的前景色。实心填充上用 fgOn<Intent>，淡色上用 fg<Intent>。中性是默认的意图色，因此它的边框与前景色就是其余一切所回落到的 color.border 与 color.fg。",
        })}
      </ShowcaseHelper>
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
  );
}

const styles = stylex.create({
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
    gap: space._2,
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
