import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

interface IntentColumn {
  name: string;
  job: string;
  fill: StyleXStyles;
  tint: StyleXStyles;
}

export function ColorIntentsShowcase() {
  const intents: IntentColumn[] = [
    {
      name: "accent",
      job: t({
        en: "Highlights, such as on or selected",
        zh: "突出显示，例如开启或选中",
      }),
      fill: styles.fillAccent,
      tint: styles.tintAccent,
    },
    {
      name: "danger",
      job: t({
        en: "Destroys, or is wrong",
        zh: "会销毁，或有错误",
      }),
      fill: styles.fillDanger,
      tint: styles.tintDanger,
    },
    {
      name: "info",
      job: t({ en: "A status to note", zh: "需要留意的状态" }),
      fill: styles.fillInfo,
      tint: styles.tintInfo,
    },
    {
      name: "success",
      job: t({ en: "A status that went well", zh: "顺利完成的状态" }),
      fill: styles.fillSuccess,
      tint: styles.tintSuccess,
    },
    {
      name: "warning",
      job: t({ en: "A status that needs care", zh: "需要小心的状态" }),
      fill: styles.fillWarning,
      tint: styles.tintWarning,
    },
    {
      name: "neutral",
      job: t({ en: "Carries no meaning", zh: "不带含义" }),
      fill: styles.fillNeutral,
      tint: styles.tintNeutral,
    },
  ];
  const fillLabel = t({ en: "Fill", zh: "填充" });
  const tintLabel = t({ en: "Tint", zh: "淡色" });

  return (
    <GuideSection
      title={t({
        en: "Give every colour a job.",
        zh: "让每种颜色都有用途。",
      })}
      lead={t({
        en: "An Intent is a colour with one job across the system. Pick the one whose job is yours, so your element agrees with the components.",
        zh: "意图色是在整个系统中只有一种用途的颜色。选用途与你相符的那一种，你的元素就与组件含义一致。",
      })}
    >
      <div css={styles.container}>
        {/* Safari drops the list role from a list without markers. */}
        <ul role="list" css={styles.grid}>
          {intents.map((intent) => (
            <li key={intent.name} css={stack.tight}>
              <div aria-hidden css={styles.tiles}>
                <span css={[corner.radius_2, styles.tile, intent.fill]}>
                  {fillLabel}
                </span>
                <span css={[corner.radius_2, styles.tile, intent.tint]}>
                  {tintLabel}
                </span>
              </div>
              <span css={stack.text}>
                <span css={[typeRole.label, styles.name]}>{intent.name}</span>
                <span css={[typeRole.bodySmall, styles.job]}>{intent.job}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <GuideNote>
        {t({
          en: "Put fgOn<Intent> on a fill and fg<Intent> on a tint. Swapped, they are hard to read.",
          zh: "填充上用 fgOn<Intent>，淡色底上用 fg<Intent>。两者对调就难以辨读。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "No control uses info, success or warning, so keep them for status.",
          zh: "没有任何控件使用 info、success 或 warning，请只把它们用于状态。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  // The grid queries this wrapper, not the viewport: the page sits beside a
  // sidebar, so the viewport width does not give the column width.
  container: {
    containerType: "inline-size",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      "@container (min-width: 24rem)": "repeat(3, minmax(0, 1fr))",
      "@container (min-width: 44rem)": "repeat(6, minmax(0, 1fr))",
    },
    rowGap: rhythm.group,
    columnGap: rhythm.item,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: rhythm.inline,
  },
  tile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    blockSize: space._8,
    fontWeight: font.weight_6,
  },
  name: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  job: {
    color: color.fgMuted,
  },

  fillAccent: { backgroundColor: color.bgAccent, color: color.fgOnAccent },
  tintAccent: { backgroundColor: color.bgAccentSubtle, color: color.fgAccent },
  fillDanger: { backgroundColor: color.bgDanger, color: color.fgOnDanger },
  tintDanger: { backgroundColor: color.bgDangerSubtle, color: color.fgDanger },
  fillInfo: { backgroundColor: color.bgInfo, color: color.fgOnInfo },
  tintInfo: { backgroundColor: color.bgInfoSubtle, color: color.fgInfo },
  fillSuccess: { backgroundColor: color.bgSuccess, color: color.fgOnSuccess },
  tintSuccess: {
    backgroundColor: color.bgSuccessSubtle,
    color: color.fgSuccess,
  },
  fillWarning: { backgroundColor: color.bgWarning, color: color.fgOnWarning },
  tintWarning: {
    backgroundColor: color.bgWarningSubtle,
    color: color.fgWarning,
  },
  fillNeutral: { backgroundColor: color.bgNeutral, color: color.fgOnNeutral },
  tintNeutral: { backgroundColor: color.bgNeutralSubtle, color: color.fg },
});
