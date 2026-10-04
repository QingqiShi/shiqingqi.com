import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { EffectContainerSpecimen } from "./effect-container-specimen.tsx";
import { EffectContainerTestBench } from "./effect-container-test-bench.tsx";

const USAGE = `"use client";

import { EffectContainer } from "@tuja/ui/components/effect-container";
import { useEffectContainer } from "@tuja/ui/hooks/use-effect-container";

function DustyCard({ children }) {
  const container = useEffectContainer();
  return (
    <section ref={container}>
      <EffectContainer value={container}>{children}</EffectContainer>
    </section>
  );
}`;

export function EffectContainerShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Effect container", zh: "效果容器" })} breakout>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Attach the ref from useEffectContainer to an element and wrap its content in EffectContainer, and the effects inside act only on each other. Each effect hook belongs to the nearest EffectContainer above it in the React tree, or else to the page. Dust in a card goes only to the Extractor fans in that card, and a fan on the page cannot reach in. Nothing crosses the edge in either direction.",
              zh: "把 useEffectContainer 返回的 ref 挂到一个元素上，再用 EffectContainer 包住它的内容，里面的效果就只会彼此作用。每个效果 hook 都属于 React 树中在它之上最近的 EffectContainer，没有时则属于页面。卡片里的灰尘只会被同一张卡片里的抽风机吸走，页面上的抽风机也伸不进来。任何东西都不会从任一方向越过边缘。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The container's effects draw on the effect layer, clipped to the container's border box and its rounded corners. Dust that leaves the box vanishes. From outside, the container is an Effect boundary: the page's effects flow around it.",
              zh: "容器的效果绘制在效果层上，并被裁剪在容器的边框盒及其圆角之内。离开这个盒子的灰尘会消失。从外部看，容器是一个效果边界：页面上的效果会绕开它流动。",
            })}
          </Text>
        </div>
        <EffectContainerSpecimen />
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="effect-container" />

      <Showcase label={t({ en: "Limits", zh: "限制" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The scope follows the React tree, not the DOM: content portalled out of the container stays in its scope, and is still clipped to the container's box. Until the container element is attached and measured, the effects of its scope do not draw.",
              zh: "作用域跟随 React 树而不是 DOM：传送到容器之外的内容仍属于它的作用域，也仍被裁剪在容器的盒子之内。在容器元素挂载并测量好之前，它作用域里的效果不会绘制。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A container that scrolls its own content, or that sits under a CSS transform or scale, does not draw its effects in the right place yet.",
              zh: "自身内容会滚动的容器，或位于 CSS transform、scale 之下的容器，目前还无法把效果绘制在正确的位置。",
            })}
          </Text>
        </div>
      </Showcase>

      <Showcase
        label={t({ en: "Effect container test bench", zh: "效果容器测试台" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Elements made for checking Effect containers: dust in a container beside a fan on the page; dust on the page beside a container that holds a fan; and an element with rings close to its container's edge. The dust stays in its own box, no fan pulls across an edge, and the rings stop at the container's edge. The debug view outlines each container in violet and labels it with the id of its scope.",
            zh: "专为检查效果容器而做的元素：容器中的灰尘旁边是页面上的抽风机；页面上的灰尘旁边是装着抽风机的容器；还有一个靠近容器边缘、会泛起涟漪的元素。灰尘应留在自己的盒子里，抽风机不会跨过边缘去吸，涟漪止于容器的边缘。调试视图会用紫色勾出每个容器，并标出它作用域的 id。",
          })}
        </ShowcaseHelper>
        <EffectContainerTestBench />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
});
