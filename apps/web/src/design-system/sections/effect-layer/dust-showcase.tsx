import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

const USAGE = `"use client";

import { useDust } from "@tuja/ui/hooks/use-dust";
import { useExtractorFan } from "@tuja/ui/hooks/use-extractor-fan";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";

function DustyCard({ children }) {
  const ref = useDust({ density: 3 });
  return <Card ref={ref}>{children}</Card>;
}

function ClearButton() {
  const ref = useExtractorFan({ reach: 400 });
  return <Button ref={ref}>Clear</Button>;
}

// One element can shed dust and pull it in: merge the two refs.
function Vent() {
  const dust = useDust();
  const fan = useExtractorFan();
  return <div ref={mergeRefs(dust, fan)} />;
}`;

export function DustShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Dust and Extractor fan", zh: "灰尘与抽风机" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Attach the ref from useDust to an element and it sheds particles in its own fill colour. They float off its edge like dust in still air. After a moment, any element with the ref from useExtractorFan within reach pulls them in: they speed up as they near it and vanish at its edge. With no fan in reach, they drift and fade.",
              zh: "把 useDust 返回的 ref 挂到一个元素上，它就会散出与自身填充色相同的粒子。粒子像静止空气中的灰尘一样从边缘飘开。片刻之后，范围内任何挂着 useExtractorFan 返回的 ref 的元素都会把它们吸过去：越靠近越快，到了边缘就消失。范围内没有抽风机时，它们会四处飘散，然后淡去。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The dust flows around every other registered element, and a moving pointer stirs it. A pointer near an element that sheds dust stirs up more.",
              zh: "灰尘会绕开其他所有已登记的元素，移动的指针会搅动它。指针靠近散出灰尘的元素时，会扬起更多灰尘。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "On a light page the dust is a darker shade of the fill, and on a dark page a lighter one, so it reads on both. Under reduced motion nothing moves: still motes sit around each element that sheds dust.",
              zh: "在浅色页面上，灰尘是填充色的较深色调；在深色页面上则是较浅色调，因此两种页面上都看得清。在减少动态效果的设置下，一切保持静止：每个散出灰尘的元素周围都停着一些静止的尘粒。",
            })}
          </Text>
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="use-dust" />

      <PropsTable component="use-extractor-fan" />
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
});
