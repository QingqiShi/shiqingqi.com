import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, controlSize, rhythm } from "@tuja/ui/tokens.stylex";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function ControlSizeShowcase() {
  const guidance = [
    {
      term: t({ en: "Heights", zh: "高度" }),
      value: "_8 · _9 · _10",
      note: t({
        en: "Button's sm, md and lg sizes are controlSize._8, _9 and _10 tall. At sm and md, TextField, Select and SegmentedControl are _8 and _9 too. A control you build at one of these heights lines up with them in a row.",
        zh: "Button 的 sm、md、lg 三个尺寸分别高 controlSize._8、_9、_10。在 sm 与 md 尺寸下，TextField、Select 与 SegmentedControl 也是 _8 与 _9。你自己搭建的控件取其中一个高度，就能与它们排成一行。",
      }),
    },
    {
      term: t({ en: "A minimum, not a height", zh: "最小高度，而非固定高度" }),
      value: "minBlockSize",
      note: t({
        en: "The steps are in px, but control labels use font.uiControl, which is in rem. Button and the fields set minBlockSize, so a control grows when the reader sets a larger text size instead of clipping its label. Do the same.",
        zh: "这些步长以 px 为单位，而控件标签用的 font.uiControl 以 rem 为单位。Button 与输入框设的是 minBlockSize，读者调大文字时控件随之变高，标签不会被截断。你也这样做。",
      }),
    },
    {
      term: t({ en: "Larger below md", zh: "md 以下更大" }),
      value: "×1.2",
      note: t({
        en: "Below the md breakpoint every step is 20% larger, and so is font.uiControl, so a control is a larger target on a phone. The change needs the stylex-breakpoints Babel plugin that Get started sets up.",
        zh: "在 md 断点以下，每一级都大 20%，font.uiControl 也一样，控件在手机上因此是更大的点按目标。这一变化需要「快速开始」中配置的 stylex-breakpoints Babel 插件。",
      }),
    },
    {
      term: t({ en: "Rounded ends", zh: "圆润的两端" }),
      value: "cornerTokens.height",
      note: t({
        en: "corner.squircle_round closes its corners at half of cornerTokens.height, which is controlSize._9 by default. Set it to your control's height, as Button and SegmentedControl do.",
        zh: "corner.squircle_round 在 cornerTokens.height 的一半处闭合角，默认是 controlSize._9。把它设成你控件的高度，Button 与 SegmentedControl 就是这样做的。",
      }),
    },
  ];

  // Each square is drawn at its token, which shrinks at the md breakpoint, so
  // the whole scale steps down live as the window widens.
  const controls = [
    { token: "controlSize._0", meta: "2.4 → 2px", swatch: styles.cs0 },
    { token: "controlSize._1", meta: "4.8 → 4px", swatch: styles.cs1 },
    { token: "controlSize._2", meta: "9.6 → 8px", swatch: styles.cs2 },
    { token: "controlSize._3", meta: "14.4 → 12px", swatch: styles.cs3 },
    { token: "controlSize._4", meta: "19.2 → 16px", swatch: styles.cs4 },
    { token: "controlSize._5", meta: "24 → 20px", swatch: styles.cs5 },
    { token: "controlSize._6", meta: "28.8 → 24px", swatch: styles.cs6 },
    { token: "controlSize._7", meta: "33.6 → 28px", swatch: styles.cs7 },
    { token: "controlSize._8", meta: "38.4 → 32px", swatch: styles.cs8 },
    { token: "controlSize._9", meta: "48 → 40px", swatch: styles.cs9 },
    { token: "controlSize._10", meta: "57.6 → 48px", swatch: styles.cs10 },
  ];

  return (
    <GuideSection
      title={t({ en: "Control size", zh: "控件尺寸" })}
      lead={t({
        en: "Build your own control on controlSize, so it matches the components in height and in how it changes with the screen. Each card below gives the value below md, then from md up.",
        zh: "用 controlSize 搭建你自己的控件，它在高度以及随屏幕变化的方式上就与组件一致。下面每张卡片先给出 md 以下的值，再给出 md 及以上的值。",
      })}
    >
      <GuideList items={guidance} />
      <UsageSnippet
        code={`import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";
import { controlSize, font } from "@tuja/ui/tokens.stylex";

<button css={[corner.squircle_round, styles.toggle]}>…</button>

const styles = stylex.create({
  // The height, padding and label size of a md Button.
  toggle: {
    [cornerTokens.height]: controlSize._9,
    minBlockSize: cornerTokens.height,
    paddingInline: controlSize._3,
    gap: controlSize._2,
    fontSize: font.uiControl,
  },
});`}
      />
      <div css={styles.grid}>
        {controls.map((step) => (
          <SpecCard key={step.token} token={step.token} meta={step.meta}>
            <div css={styles.csFloor}>
              <span css={[corner.radius_1, styles.csSwatch, step.swatch]} />
            </div>
          </SpecCard>
        ))}
      </div>
    </GuideSection>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: rhythm.item,
  },
  csFloor: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "56px",
  },
  csSwatch: {
    backgroundColor: color.bgAccent,
  },
  cs0: { inlineSize: controlSize._0, blockSize: controlSize._0 },
  cs1: { inlineSize: controlSize._1, blockSize: controlSize._1 },
  cs2: { inlineSize: controlSize._2, blockSize: controlSize._2 },
  cs3: { inlineSize: controlSize._3, blockSize: controlSize._3 },
  cs4: { inlineSize: controlSize._4, blockSize: controlSize._4 },
  cs5: { inlineSize: controlSize._5, blockSize: controlSize._5 },
  cs6: { inlineSize: controlSize._6, blockSize: controlSize._6 },
  cs7: { inlineSize: controlSize._7, blockSize: controlSize._7 },
  cs8: { inlineSize: controlSize._8, blockSize: controlSize._8 },
  cs9: { inlineSize: controlSize._9, blockSize: controlSize._9 },
  cs10: { inlineSize: controlSize._10, blockSize: controlSize._10 },
});
