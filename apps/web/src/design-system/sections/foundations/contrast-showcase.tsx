import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { t } from "#src/i18n.ts";

/**
 * The contrast floors the colour tokens hold, as `tokens.contrast.test.ts`
 * checks them, and the short reason they hold. The last section on the page.
 */
export function ContrastShowcase() {
  return (
    <GuideSection
      title={t({
        en: "What the tokens guarantee",
        zh: "令牌保障什么",
      })}
      lead={t({
        en: "Each pairing below holds its floor in light and in dark, and the package's tests fail when one drops under it. Keep to these pairings and you need not measure them. Contrast is in APCA's Lc, which reads light text on a dark ground differently from dark text on a light one, as the eye does.",
        zh: "下面每一种搭配在浅色与深色下都保持其下限，任何一种跌破下限，这个包的测试就会失败。只用这些搭配，就无需自己测量。对比度以 APCA 的 Lc 衡量：它像眼睛一样，区分深底浅字与浅底深字。",
      })}
    >
      <GuideList
        items={[
          {
            term: "color.fg",
            value: "Lc 75",
            note: t({
              en: "On every canvas, surface and control background, bgNeutralSubtle included. That is APCA's floor for 16px body text.",
              zh: "在每一种画布、表面与控件背景上，包括 bgNeutralSubtle。这是 APCA 对 16px 正文的下限。",
            }),
          },
          {
            term: "color.fgMuted",
            value: "Lc 60",
            note: t({
              en: "On the same backgrounds, and more than Lc 12 below fg on the canvas, so the two still read as two levels.",
              zh: "在同样的背景上；并且在画布上比 fg 低 Lc 12 以上，使二者仍读作两个层级。",
            }),
          },
          {
            term: "color.fg<Intent>",
            value: t({
              en: "Lc 75 on the page, Lc 60 on its tint",
              zh: "页面上 Lc 75，淡色底上 Lc 60",
            }),
            note: t({
              en: "On the canvas and every surface, and on bg<Intent>Subtle laid over any of them.",
              zh: "在画布与每一种表面上，以及叠在它们之上的 bg<Intent>Subtle 上。",
            }),
          },
          {
            term: "color.fgOn<Intent>",
            value: t({
              en: "Lc 60 on the fill, Lc 50 on hover",
              zh: "填充上 Lc 60，悬停时 Lc 50",
            }),
            note: t({
              en: "Lc 60 is the floor for a 16px semibold label, the smallest a fill carries. The hover fill is a brief state of the same label.",
              zh: "Lc 60 是 16px 半粗标签的下限，也是填充所承载的最小文字。悬停填充只是同一标签的短暂状态。",
            }),
          },
          {
            term: "color.fgOnScrim",
            value: "Lc 75",
            note: t({
              en: "On the scrim laid over white, the brightest thing it can dim.",
              zh: "在叠于白色之上的遮罩上测量，白色是它可能压暗的最亮的东西。",
            }),
          },
        ]}
      />
      <GuideNote>
        {t({
          en: "Nothing else is under test. fgOnControlBright on bgControlBright and fgOnInverse on bgInverse have no floor, and neither has fg or fgMuted on a coloured Intent tint. Check those yourself.",
          zh: "除此之外的搭配都不在测试范围内。bgControlBright 上的 fgOnControlBright、bgInverse 上的 fgOnInverse 都没有下限保障；彩色意图色淡色底上的 fg 或 fgMuted 同样没有。这些请自行检查。",
        })}
      </GuideNote>
    </GuideSection>
  );
}
