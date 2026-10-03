import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { DustTestBench } from "./dust-test-bench.tsx";

const USAGE = `import { Dust } from "@tuja/ui/components/dust";
import { ExtractorFan } from "@tuja/ui/components/extractor-fan";

<Dust density={3}>
  <Card>{children}</Card>
</Dust>

<ExtractorFan reach={400}>
  <Button>Clear</Button>
</ExtractorFan>`;

export function DustShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Dust and Extractor fan", zh: "灰尘与抽风机" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Wrap an element in Dust and it sheds particles in its own fill colour. They float off its edge like dust in still air. After a moment, any element wrapped in ExtractorFan within reach pulls them in: they speed up as they near it and vanish at its edge. With no fan in reach, they drift and fade.",
              zh: "用 Dust 包住一个元素，它就会散出与自身填充色相同的粒子。粒子像静止空气中的灰尘一样从边缘飘开。片刻之后，范围内任何用 ExtractorFan 包住的元素都会把它们吸过去：越靠近越快，到了边缘就消失。范围内没有抽风机时，它们会四处飘散，然后淡去。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The particles live in the page, so a stream flows on across the edge between the two scroll <canvas> elements. They flow around every other registered element, and a moving pointer stirs them. A pointer near an element that sheds dust stirs up more.",
              zh: "粒子存在于页面之中，因此一股粒子流会顺畅地跨过两个滚动 <canvas> 元素之间的边缘。它们会绕开其他所有已登记的元素，移动的指针会搅动它们。指针靠近散出灰尘的元素时，会扬起更多灰尘。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "On a light page the dust is a darker shade of the fill, and on a dark page a lighter one, so it reads on both. While no element that sheds dust is near the screen, the effect draws nothing and runs no frame. Under reduced motion nothing moves: still motes sit around each element that sheds dust.",
              zh: "在浅色页面上，灰尘是填充色的较深色调；在深色页面上则是较浅色调，因此两种页面上都看得清。当屏幕附近没有散出灰尘的元素时，这个效果什么都不绘制，也不运行任何帧。在减少动态效果的设置下，一切保持静止：每个散出灰尘的元素周围都停着一些静止的尘粒。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="dust" />

      <PropsTable component="extractor-fan" />

      <Showcase
        label={t({ en: "Dust test bench", zh: "灰尘测试台" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Elements made for checking the effect: dust with no fan in reach, a fan close by, two pillars taller than a band so the flow between them crosses a band edge, and a far fan past an obstacle. Move the pointer through the streams, scroll the pillars past a band edge, and switch the theme. The debug view, opened from the test bench above, shows the bands while the dust flows.",
            zh: "专为检查这个效果而做的元素：范围内没有抽风机的灰尘、近处的抽风机、两根比带更高的柱子（它们之间的粒子流会跨过带的边缘），以及隔着障碍物的远处抽风机。让指针穿过粒子流，滚动页面让柱子经过带的边缘，再切换主题。从上方测试台打开的调试视图，会在灰尘流动时显示各条带。",
          })}
        </ShowcaseHelper>
        <DustTestBench />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
});
