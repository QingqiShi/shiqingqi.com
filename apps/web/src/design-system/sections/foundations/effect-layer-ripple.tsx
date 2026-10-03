import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { EffectLayerRippleBench } from "./effect-layer-ripple-bench.tsx";

const USAGE = `import { Ripple } from "@tuja/ui/components/ripple";

<Ripple>
  <Card>{children}</Card>
</Ripple>

<Ripple ambient>
  <Button>{label}</Button>
</Ripple>`;

/** The Ripple effect: what it draws, how it reacts, and a bench to try it on. */
export function EffectLayerRipple() {
  return (
    <>
      <Showcase label={t({ en: "Ripple", zh: "涟漪" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Ripple pulses an element's background colour out from its edge in rings that slow down and fade as they spread. Wrap one element in Ripple.",
              zh: "涟漪让元素的背景色从边缘向外脉动，形成逐渐减速、边扩散边淡去的圆环。用 Ripple 包住一个元素即可。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The pointer coming over the element starts a pulse that leans towards it, stronger when the pointer comes in fast. A press starts a full pulse that leans towards the press, and its ring sets off a weaker pulse in each rippling neighbour it reaches. Keyboard focus starts an even pulse. Rings fade out before the edges of other registered elements.",
              zh: "指针移到元素上时会发出一次偏向指针一侧的脉动，指针移入越快，脉动越强。按下会发出一次完整的脉动，偏向按下的位置，它的圆环到达相邻的涟漪元素时，会让对方发出一次较弱的脉动。键盘聚焦会发出一次均匀的脉动。圆环会在其他已登记元素的边缘之前淡去。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Each ring takes the element's fill as it shows over the page. A fill close to the page's own colour gets a ring a little darker on a light page and a little lighter on a dark one, so that it still shows. An element without a background colour draws no ring.",
              zh: "每个圆环都取元素填充色叠在页面上的样子。填充色与页面颜色接近时，圆环在浅色页面上会稍深一些，在深色页面上会稍浅一些，以便仍能看清。没有背景色的元素不会绘制圆环。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Under reduced motion no ring travels. A still ring marks hover, focus and a press, and an ambient element does not pulse.",
              zh: "在减少动态效果的设置下，圆环不会移动。悬停、聚焦与按下改由一个静止的圆环标示，自行脉动的元素也不再脉动。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="ripple" />

      <Showcase
        label={t({ en: "Ripple test bench", zh: "涟漪测试台" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Move the pointer over each tile from different sides, fast and slow, then press one: its neighbours answer, and the rings fade before the dashed tile. Tab to the button for focus. Switch the theme, scroll while a ring spreads, and turn on reduced motion in your system settings.",
            zh: "从不同方向、以不同速度把指针移到各个方块上，再按下其中一个：相邻的方块会回应，圆环会在虚线方块之前淡去。用 Tab 键聚焦到按钮上查看聚焦效果。切换主题，在圆环扩散时滚动页面，并在系统设置中打开减少动态效果。",
          })}
        </ShowcaseHelper>
        <EffectLayerRippleBench />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
});
