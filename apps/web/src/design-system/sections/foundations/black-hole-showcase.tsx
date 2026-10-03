import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { BlackHoleTestBench } from "./black-hole-test-bench.tsx";

const USAGE = `"use client";

import { useBlackHole } from "@tuja/ui/hooks/use-black-hole";
import { useLightBeam } from "@tuja/ui/hooks/use-light-beam";

function Lamp() {
  const ref = useLightBeam();
  return <Badge ref={ref} intent="accent">Lamp</Badge>;
}

function HeavyCard({ children }) {
  const ref = useBlackHole({ mass: 1.5 });
  return <Card ref={ref}>{children}</Card>;
}`;

export function BlackHoleShowcase() {
  return (
    <>
      <Showcase
        label={t({ en: "Black hole and Light beam", zh: "黑洞与光束" })}
      >
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A Light beam casts a ray of light in its own fill colour, behind the page, from the centre of its element. It turns towards the pointer on a spring, and when the pointer leaves it comes back to point at the nearest Black hole.",
              zh: "光束从其元素的中心，在页面之后投出一道与自身填充色相同的光。它以弹簧动效转向指针；指针离开后，它回到指向最近的黑洞。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A Black hole bends the light that passes behind it, as a mass bends light in space. The bend follows the element's outline and grows with its size, so light curves around its edges, and light from straight behind its centre shows as a ring around it. The bends of several Black holes add up.",
              zh: "黑洞会弯折从它身后经过的光，就像太空中的质量弯折光线。弯折沿着元素的轮廓，并随尺寸增大，因此光会绕着它的边缘弯曲；从它中心正后方射来的光会在它周围显现为一道光环。多个黑洞的弯折会叠加。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "On a dark page the light brightens what it crosses; on a light page it tints it. Dust in the beam catches the light. The effect draws only where its light reaches the screen, and draws new frames only while a beam turns. With reduced motion, a beam turns only while the pointer is pressed, and with no spring.",
              zh: "在深色页面上，光会照亮它经过的地方；在浅色页面上，它为经过的地方染上颜色。光束中的尘埃会被照亮。这个效果只在光能照到屏幕的地方绘制，并且只在光束转动时绘制新的帧。在减少动态效果模式下，光束只在按下指针时转向，且没有弹簧动效。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="use-black-hole" />

      <PropsTable component="use-light-beam" />

      <Showcase
        label={t({ en: "Black hole test bench", zh: "黑洞测试台" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Move the pointer to turn both beams, or touch and hold on a phone, and point at a Black hole to light its ring. The lower Black hole always sits on the edge between the two scroll <canvas> elements: in the debug view, check that the light meets across that edge while you scroll.",
            zh: "移动指针即可转动两道光束；在手机上则按住屏幕。指向黑洞即可点亮它的光环。下方的黑洞始终位于两个滚动 <canvas> 元素的交界处：在调试视图中滚动页面，检查光在交界两侧是否衔接。",
          })}
        </ShowcaseHelper>
        <BlackHoleTestBench />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
});
