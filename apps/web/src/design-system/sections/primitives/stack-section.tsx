import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { ApiGrid, type ApiEntry, GenreChips } from "./api-grid.tsx";

export function StackSection() {
  const api: ApiEntry[] = [
    {
      token: "stack.tight",
      meta: "column · gap rhythm.tight",
      description: t({
        en: "Inside one item: a heading and its own text, a stage and its caption.",
        zh: "同一项之内：标题与它自己的文字、展示区与它的说明。",
      }),
    },
    {
      token: "stack.item",
      meta: "column · gap rhythm.item",
      description: t({
        en: "Siblings in a group, such as the examples in one section.",
        zh: "同一组中的同级元素，例如一个小节里的各个示例。",
      }),
    },
    {
      token: "stack.group",
      meta: "column · gap rhythm.group",
      description: t({
        en: "Between groups, such as h3 sub-sections.",
        zh: "组与组之间，例如 h3 子小节。",
      }),
    },
    {
      token: "stack.section",
      meta: "column · gap rhythm.section",
      description: t({
        en: "Between h2 sections. It grows at md.",
        zh: "h2 小节之间。在 md 断点处变大。",
      }),
    },
    {
      token: "cluster.inline",
      meta: "wrapping row · gap rhythm.inline",
      description: t({
        en: "The parts of one unit on one line, such as a value and its unit, where they may wrap.",
        zh: "同一单元在一行内的各部分，例如数值与它的单位，允许换行。",
      }),
    },
    {
      token: "cluster.tight",
      meta: "wrapping row · gap rhythm.tight",
      description: t({
        en: "A row inside one item, such as a name and its badges.",
        zh: "同一项之内的一行，例如名称与它的徽章。",
      }),
    },
    {
      token: "cluster.item",
      meta: "wrapping row · gap rhythm.item",
      description: t({
        en: "A row of siblings, such as the controls in a toolbar.",
        zh: "一行同级元素，例如工具栏中的各个控件。",
      }),
    },
    {
      token: "row.inline",
      meta: "row · gap rhythm.inline",
      description: t({
        en: "The same steps on a row that does not wrap, such as an icon and its label.",
        zh: "不换行的一行，档位相同，例如图标与它的标签。",
      }),
    },
    {
      token: "row.tight",
      meta: "row · gap rhythm.tight",
      description: t({
        en: "A row inside one item that does not wrap, such as a title and its count.",
        zh: "同一项之内不换行的一行，例如标题与它的计数。",
      }),
    },
    {
      token: "row.item",
      meta: "row · gap rhythm.item",
      description: t({
        en: "A row of siblings that does not wrap, such as a message and its actions.",
        zh: "不换行的一行同级元素，例如一条消息与它的操作。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Stack", zh: "堆叠" })}>
      <ShowcaseHelper>
        {t({
          en: "A container that owns the space between its children, at one Rhythm step: stack for a column, cluster for a row that wraps, row for a row that does not. Pick the step by how the children relate, not by the size you want. The children set no margin to push their neighbours away.",
          zh: "由容器负责子元素之间的间距，取一个节奏档位：stack 用于一列，cluster 用于可换行的一行，row 用于不换行的一行。按子元素之间的关系选择档位，而不是按想要的尺寸。子元素不设置外边距去推开相邻元素。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid>
        <Specimen token="stack.item">
          <div css={[stack.item, fill.inline]}>
            <span css={[corner.radius_1, styles.bar]} />
            <span css={[corner.radius_1, styles.bar]} />
            <span css={[corner.radius_1, styles.bar]} />
          </div>
        </Specimen>
        <Specimen token="cluster.tight">
          <GenreChips css={cluster.tight} />
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";

<section css={stack.tight}>
  <h2>…</h2>
  <div css={stack.item}>…</div>
</section>
<div css={cluster.tight}>…</div>
<span css={row.inline}><Icon /> Label</span>`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  bar: {
    blockSize: space._5,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
});
