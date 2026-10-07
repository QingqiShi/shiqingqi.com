import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { onReadingColumn } from "#src/design-system/reading-column.stylex.ts";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { t } from "#src/i18n.ts";
import { BlackHoleTestBench } from "./black-hole-test-bench.tsx";
import { DustTestBench } from "./dust-test-bench.tsx";
import { EffectContainerTestBench } from "./effect-container-test-bench.tsx";
import { EffectLayerRippleBench } from "./effect-layer-ripple-bench.tsx";
import { EffectLayerTestBench } from "./effect-layer-test-bench.tsx";

interface BenchProps {
  title: string;
  helper: string;
  children: ReactNode;
}

function Bench({ title, helper, children }: BenchProps) {
  return (
    <Showcase frame="plain" breakout>
      <div css={stack.item}>
        <div css={stack.tight}>
          <Heading level={3} css={onReadingColumn.base}>
            {title}
          </Heading>
          <ShowcaseHelper>{helper}</ShowcaseHelper>
        </div>
        {children}
      </div>
    </Showcase>
  );
}

/** Every bench on the page, kept apart from the documentation above them. */
export function EffectLayerTestBenches() {
  return (
    <GuideSection
      title={t({ en: "Test benches", zh: "测试台" })}
      lead={t({
        en: "Elements made for checking the layer and each effect by hand. The debug view shows the bands: two scroll <canvas> elements, each a little taller than the viewport, take turns to cover the document, and a third is fixed to the viewport for fixed elements.",
        zh: "专为手动检查效果层与各个效果而做的元素。调试视图会显示各条带：两个各比视口略高的滚动 <canvas> 元素轮流覆盖文档，第三个固定在视口上，供固定元素使用。",
      })}
    >
      <div css={stack.group}>
        <div css={styles.debugLink}>
          <AnchorButton href="?effects=debug" look="outline" size="sm">
            {t({ en: "Open the debug view", zh: "打开调试视图" })}
          </AnchorButton>
        </div>

        {/* The WebGPU specs scroll the Black hole and Dust benches past a band
            edge, so these two benches need page below them. */}
        <Bench
          title={t({ en: "Black hole and Light beam", zh: "黑洞与光束" })}
          helper={t({
            en: "Move the pointer to turn both beams, or touch and hold on a phone, and point at a Black hole to light its ring. The lower Black hole always sits on the edge between the two scroll <canvas> elements: in the debug view, check that the light meets across that edge while you scroll.",
            zh: "移动指针即可转动两道光束；在手机上则按住屏幕。指向黑洞即可点亮它的光环。下方的黑洞始终位于两个滚动 <canvas> 元素的交界处：在调试视图中滚动页面，检查光在交界两侧是否衔接。",
          })}
        >
          <BlackHoleTestBench />
        </Bench>

        <Bench
          title={t({ en: "Dust and Extractor fan", zh: "灰尘与抽风机" })}
          helper={t({
            en: "Dust with no fan in reach, a fan close by, two pillars taller than a band so the flow between them crosses a band edge, and a far fan past an obstacle. Move the pointer through the streams, scroll the pillars past a band edge, and switch the theme.",
            zh: "范围内没有抽风机的灰尘、近处的抽风机、两根比带更高的柱子（它们之间的粒子流会跨过带的边缘），以及隔着障碍物的远处抽风机。让指针穿过粒子流，滚动页面让柱子经过带的边缘，再切换主题。",
          })}
        >
          <DustTestBench />
        </Bench>

        <Bench
          title={t({ en: "Effect container", zh: "效果容器" })}
          helper={t({
            en: "Dust in a container beside a fan on the page; dust on the page beside a container that holds a fan; and an element with rings close to its container's edge. The dust stays in its own box, no fan pulls across an edge, and the rings stop at the container's edge. The debug view outlines each container in violet and labels it with the id of its scope.",
            zh: "容器中的灰尘旁边是页面上的抽风机；页面上的灰尘旁边是装着抽风机的容器；还有一个靠近容器边缘、会泛起涟漪的元素。灰尘应留在自己的盒子里，抽风机不会跨过边缘去吸，涟漪止于容器的边缘。调试视图会用紫色勾出每个容器，并标出它作用域的 id。",
          })}
        >
          <EffectContainerTestBench />
        </Bench>

        {/* The ripple specs count frames while nothing moves, and a Black hole
            or Dust near the Ripple bench keeps frames running. */}
        <Bench
          title={t({ en: "Ripple", zh: "涟漪" })}
          helper={t({
            en: "Move the pointer over each tile from different sides, fast and slow, then press one: its neighbours answer, and the rings fade before the dashed tile. Tab to the button for focus. Switch the theme, scroll while a ring spreads, and turn on reduced motion in your system settings.",
            zh: "从不同方向、以不同速度把指针移到各个方块上，再按下其中一个：相邻的方块会回应，圆环会在虚线方块之前淡去。用 Tab 键聚焦到按钮上查看聚焦效果。切换主题，在圆环扩散时滚动页面，并在系统设置中打开减少动态效果。",
          })}
        >
          <EffectLayerRippleBench />
        </Bench>

        <Bench
          title={t({ en: "Registered elements", zh: "已登记的元素" })}
          helper={t({
            en: "Each element below gets a line on its edge in the debug view, green in the page and orange when fixed, and a band of the fill it read. Scroll, resize the window, switch the theme, hover the button and add the block above: the lines stay on the edges. These elements have no effect, so outside the debug view they draw nothing.",
            zh: "在调试视图中，下方每个元素的边缘都有一条线（页面中的为绿色，固定的为橙色），外加一条它读到的填充色带。滚动、调整窗口大小、切换主题、悬停按钮、在上方加入色块：这些线都应贴在边缘上。这些元素没有效果，因此在调试视图之外不会绘制任何东西。",
          })}
        >
          <EffectLayerTestBench />
        </Bench>
      </div>
    </GuideSection>
  );
}

const styles = stylex.create({
  debugLink: {
    display: "flex",
  },
});
