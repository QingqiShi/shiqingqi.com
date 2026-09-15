import { t } from "#src/i18n.ts";
import { GuideList } from "../../guide/guide-list.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

/**
 * The two contrast standards, each defined in plain words, and the floors the
 * tokens hold in both themes. The last section on the page.
 */
export function ContrastShowcase() {
  return (
    <Showcase label={t({ en: "Contrast", zh: "对比度" })} frame="plain">
      <ShowcaseHelper>
        {t({
          en: "Contrast is how far apart text and its background are in lightness. Two standards measure it, the palette uses both, and the tests fail when a pairing drops under its floor in either theme.",
          zh: "对比度是文字与其背景在明度上的距离。有两套标准衡量它，调色板两者都用；任一搭配在任一主题下跌破下限，测试即失败。",
        })}
      </ShowcaseHelper>
      <GuideList
        items={[
          {
            term: t({
              en: "WCAG 2 contrast ratio",
              zh: "WCAG 2 对比度比值",
            }),
            value: t({
              en: "Luminance ratio, from 1:1 to 21:1",
              zh: "亮度之比，从 1:1 到 21:1",
            }),
            note: t({
              en: "The published test in the Web Content Accessibility Guidelines: the lighter colour's luminance over the darker one's, each plus a small offset. Level AA asks 4.5:1 of body text and 3:1 of large text and UI. It is the standard a reader can hold the system to, and the palette's swatch foregrounds are picked by it: black or white, whichever contrasts more, and every one reaches 4.5:1.",
              zh: "《Web 内容无障碍指南》公开的检验：较亮颜色的亮度除以较暗颜色的亮度，各加一个小偏移。AA 级要求正文 4.5:1，大号文字与界面元素 3:1。它是读者可以据以衡量系统的标准；调色板的色块前景也由它选出：黑或白中对比更高者，且全部达到 4.5:1。",
            }),
          },
          {
            term: "APCA",
            value: "Accessible Perceptual Contrast Algorithm",
            note: t({
              en: "The contrast method drafted for WCAG 3. Where the ratio ignores which colour is on top, APCA is polarity-aware: light text on a mid-tone fill and dark text on the same fill get different scores, matching what the eye sees. The ratio rates black on a mid-tone purple above white, the opposite of what the eye sees, which is why the tokens are tuned in APCA.",
              zh: "为 WCAG 3 起草的对比度方法。比值不问哪个颜色在上面，APCA 则区分极性：中间色调底上的浅色字与深色字得到不同的分数，与眼睛所见一致。比值给中间色调紫底上的黑字打分高于白字，与眼睛所见相反，令牌因此以 APCA 调校。",
            }),
          },
          {
            term: "Lc",
            value: t({
              en: "Lightness contrast, APCA's unit",
              zh: "明度对比度，APCA 的单位",
            }),
            note: t({
              en: "From 0 for no contrast to about 106 for black on white. APCA's guide floors: 90 for 14px body text, 75 for 16px body text, 60 for 16px semibold or 24px text, 45 for large headlines and non-text, and 30 for anything that must be read at all.",
              zh: "从 0（无对比）到约 106（白底黑字）。APCA 的参考下限：14px 正文 90，16px 正文 75，16px 半粗体或 24px 文字 60，大标题与非文字 45，凡需辨读的内容 30。",
            }),
          },
          {
            term: t({
              en: "The floors the tokens hold",
              zh: "令牌遵守的下限",
            }),
            value: t({ en: "Lc 75, 60 and 50", zh: "Lc 75、60 与 50" }),
            note: t({
              en: "color.fg holds Lc 75 and color.fgMuted Lc 60 on every opaque surface they can sit on, with more than Lc 12 between them on the canvas so they read as two levels. A label on an Intent fill holds Lc 60 on Base and Lc 50 on Hover, a transient lift of the same label. All of it in both themes.",
              zh: "color.fg 在其可能落在的每一个不透明表面上保持 Lc 75，color.fgMuted 保持 Lc 60，二者在画布上相距 Lc 12 以上，以读作两个层级。意图色填充上的标签在 Base 上保持 Lc 60，在 Hover 上保持 Lc 50，因为那只是同一标签的短暂抬升。以上均在两种主题下成立。",
            }),
          },
          {
            term: "light-dark()",
            value: t({ en: "One token, two values", zh: "一个令牌，两个值" }),
            note: t({
              en: "Each colour token is one light-dark() value that resolves through the element's colour scheme, so there is no second stylesheet. The two mappings are tuned so that a role has the same contrast against the canvas in light and in dark.",
              zh: "每个颜色令牌都是一个 light-dark() 值，随元素的配色方案解析，因此没有第二套样式表。两套映射经调校，使同一角色在浅色与深色主题下对画布有相同的对比度。",
            }),
          },
        ]}
      />
    </Showcase>
  );
}
