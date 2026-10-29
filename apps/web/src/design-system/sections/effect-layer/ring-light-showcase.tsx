import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

const USAGE = `"use client";

import { useRingLight } from "@tuja/ui/hooks/use-ring-light";

function Arrived() {
  const ref = useRingLight();
  // Mount it when the light should run; it runs once.
  return <span ref={ref} aria-hidden css={styles.outline} />;
}`;

/** The Ring light effect: what it draws and when. */
export function RingLightShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Ring light", zh: "环形光" })} leadsWithText>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Ring light runs one comet of light round an element's outline, once, when the element arrives on the effect layer. It sets off from the middle of the inline-start edge, runs over the top and all the way round, and slows and fades as it comes back. Attach the ref from useRingLight to the element, and mount it when the light should run.",
              zh: "环形光在元素出现在效果层上时，让一颗光点沿元素的轮廓跑一圈，只跑一次。它从行首一侧边缘的中点出发，越过顶部绕完一整圈，回到起点时逐渐减速并淡去。把 useRingLight 返回的 ref 挂到元素上，并在需要光跑动时挂载该元素。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The light takes the element's color, and follows its border box and corner radius. Toast uses it once it has arrived.",
              zh: "光取元素的 color，并沿着它的边框盒与圆角运行。轻提示在到位后使用它。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Under reduced motion no comet runs: a still glow shows round the outline for a moment instead. Where the effect layer is off, nothing draws, so the light must never be the only sign that something happened.",
              zh: "在减少动态效果的设置下，光点不会跑动，改为在轮廓周围短暂显示一圈静止的光。效果层关闭时什么也不会绘制，因此这道光绝不能是某件事发生的唯一标志。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />
    </>
  );
}
