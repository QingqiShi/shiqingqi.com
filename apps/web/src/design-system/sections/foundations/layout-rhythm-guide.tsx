import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function LayoutRhythmGuide() {
  const steps = [
    {
      term: "rhythm.inline",
      value: t({
        en: "4px · the parts of one unit on one line",
        zh: "4px · 同一单元在一行内的各部分",
      }),
      note: t({
        en: "An icon and its label, a value and its unit. Inside a control, the same gap comes from controlSize.",
        zh: "图标与它的标签、数值与它的单位。在控件内部，同样的间隙取自 controlSize。",
      }),
    },
    {
      term: "rhythm.tight",
      value: t({ en: "8px · inside one item", zh: "8px · 一项之内" }),
      note: t({
        en: "A heading and its own text, a term and its note, a specimen and its caption.",
        zh: "标题与它自己的正文、术语与它的注释、样例与它的说明。",
      }),
    },
    {
      term: "rhythm.item",
      value: t({ en: "16px · siblings in a group", zh: "16px · 一组中的同级" }),
      note: t({
        en: "The fields of a form, the cards in a list, the paragraphs under one heading.",
        zh: "表单中的各个字段、列表中的卡片、同一标题下的各个段落。",
      }),
    },
    {
      term: "rhythm.group",
      value: t({ en: "32px · between groups", zh: "32px · 组与组之间" }),
      note: t({
        en: "One group of siblings and the next, such as the sub-sections under an h3.",
        zh: "一组同级与下一组之间，比如 h3 下的各个小节。",
      }),
    },
    {
      term: "rhythm.section",
      value: t({ en: "48px · 64px from md", zh: "48px · md 起为 64px" }),
      note: t({
        en: "One h2 section and the next. It is the only step that changes with the screen, because a phone has less room to spend between sections.",
        zh: "一个 h2 区块与下一个之间。只有这一级随屏幕变化，因为手机上能留给区块之间的空间更少。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Rhythm", zh: "节奏" })}
        lead={t({
          en: "The space between two things comes from rhythm. Pick the step by how the two relate, not by how big the space looks. Each step is about twice the one below, so the space alone tells a reader what belongs together.",
          zh: "两件事物之间的间距取自 rhythm。按两者之间的关系选级，而不是按间距看起来有多大。每一级约是下一级的两倍，因此单凭间距，读者就能看出哪些内容属于一起。",
        })}
      >
        <GuideList items={steps} />
        <Specimen
          caption={t({
            en: "Two groups in stack.group; a title and its text in stack.tight; the actions in cluster.tight",
            zh: "两组内容放在 stack.group 中；标题与正文放在 stack.tight 中；操作放在 cluster.tight 中",
          })}
        >
          <div css={[stack.group, styles.specimen]}>
            <Card>
              <div css={stack.tight}>
                <Text weight="semibold">
                  {t({ en: "Tonight", zh: "今晚" })}
                </Text>
                <Text look="bodySmall" tone="muted">
                  {t({
                    en: "Two films, under four hours together.",
                    zh: "两部电影，加起来不到四个小时。",
                  })}
                </Text>
              </div>
              <div css={cluster.tight}>
                <Button size="sm" look="primary">
                  {t({ en: "Play", zh: "播放" })}
                </Button>
                <Button size="sm">{t({ en: "Save", zh: "保存" })}</Button>
              </div>
            </Card>
            <Card>
              <div css={stack.tight}>
                <Text weight="semibold">
                  {t({ en: "This weekend", zh: "本周末" })}
                </Text>
                <Text look="bodySmall" tone="muted">
                  {t({
                    en: "A three-part series, one part a night.",
                    zh: "一部三集的剧，每晚看一集。",
                  })}
                </Text>
              </div>
              <div css={cluster.tight}>
                <Button size="sm">{t({ en: "Save", zh: "保存" })}</Button>
              </div>
            </Card>
          </div>
        </Specimen>
      </GuideSection>

      <GuideSection
        title={t({ en: "Stacks own the gap", zh: "间隙由堆叠决定" })}
        lead={t({
          en: "Put the space on the container, not on its children. A stack sets one gap between everything it holds, so a child that moves, hides or wraps leaves the rhythm as it was. Compose stack for a column, cluster for a row that wraps, and row for a row that does not.",
          zh: "把间距放在容器上，而不是放在子元素上。堆叠在它包含的所有元素之间设定同一个间隙，因此子元素移动、隐藏或换行时，节奏保持不变。纵向的一列用 stack，会换行的一行用 cluster，不换行的一行用 row。",
        })}
      >
        <UsageSnippet
          code={`import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";

<section css={stack.item}>
  <header css={stack.tight}>
    <h3>Tonight</h3>
    <p>Two films, under four hours together.</p>
  </header>
  <div css={cluster.tight}>
    <Button look="primary">Play</Button>
    <Button>Save</Button>
  </div>
</section>;

// A grid, or a layout the primitives do not cover, takes the token.
const styles = stylex.create({
  shelf: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))",
    gap: rhythm.item,
  },
});`}
        />
        <GuideNote>
          {t({
            en: "stack has the steps from tight to section. cluster and row have inline, tight and item only: a row of controls or chips is one group, and groups and sections do not sit side by side in a row.",
            zh: "stack 有从 tight 到 section 的各级。cluster 与 row 只有 inline、tight 与 item：一行控件或标签是一组，而组与区块不会并排放在一行里。",
          })}
        </GuideNote>
      </GuideSection>
    </>
  );
}

const styles = stylex.create({
  specimen: {
    maxInlineSize: "20rem",
  },
});
