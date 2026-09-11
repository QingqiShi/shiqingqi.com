import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { t } from "#src/i18n.ts";
import { GuideList } from "../../guide/guide-list.tsx";
import { GuideNote, GuideSection } from "../../guide/guide-section.tsx";
import { importLine } from "../../lab/build-lab-snippet.ts";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { CodeBlockPartsControl } from "./code-block-specimens.tsx";

/**
 * One import line, one comment, and one lowercase tag around a component
 * with an attribute, a string, a number, and a property access: every kind
 * `TOKEN_KINDS` names, in one snippet.
 */
const RUNS: readonly CodeToken[] = [
  ...importLine("Progress", "@tuja/ui/components/progress"),
  ["plain", "\n\n"],
  ["comment", "// Reports how far the upload has got."],
  ["plain", "\n"],
  ["punct", "<"],
  ["tag", "div"],
  ["plain", " "],
  ["attr", "className"],
  ["punct", "="],
  ["string", '"upload"'],
  ["punct", ">"],
  ["plain", "\n  "],
  ["punct", "<"],
  ["component", "Progress"],
  ["plain", " "],
  ["attr", "value"],
  ["punct", "="],
  ["punct", "{"],
  ["number", "42"],
  ["punct", "}"],
  ["plain", " "],
  ["attr", "label"],
  ["punct", "="],
  ["punct", "{"],
  ["plain", "upload"],
  ["punct", "."],
  ["property", "name"],
  ["punct", "}"],
  ["plain", " "],
  ["punct", "/>"],
  ["plain", "\n"],
  ["punct", "</"],
  ["tag", "div"],
  ["punct", ">"],
];

export function CodeBlockShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Runs", zh: "片段" })}>
        <ShowcaseHelper>
          {t({
            en: "Ten kinds, three hues. Kinds that do the same job share a colour: a string and a number are both literals, an attribute name and a property name both name a value. The greys repeat the page's own text roles, so a snippet reads as part of the page.",
            zh: "十种类型，三种色相。担任相同角色的类型共用一种颜色：字符串与数字同属字面量，属性名与属性访问同样是在为一个值命名。灰色沿用页面自身的文本角色，因此代码片段读起来像页面的一部分。",
          })}
        </ShowcaseHelper>
        <Specimen caption={t({ en: "every kind", zh: "全部类型" })}>
          <CodeBlock source={RUNS} />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Parts", zh: "Parts" })}>
        <ShowcaseHelper>
          {t({
            en: "A part whose id stays keeps its box across a change: what stays slides to its new place, what arrives rises in, and what leaves fades where it stood. With reduced motion the slide and the rise go; the fade stays.",
            zh: "id 保持不变的 part 会在改动前后保留同一个盒子：保留的部分滑动到新位置，新增的部分升起淡入，离开的部分原地淡出。开启减弱动效后，滑动与升起会消失，淡出则保留。",
          })}
        </ShowcaseHelper>
        <Specimen caption={t({ en: "operable", zh: "可操作" })}>
          <CodeBlockPartsControl />
        </Specimen>
      </Showcase>

      <GuideSection
        title={t({ en: "Building parts", zh: "构建 parts" })}
        lead={t({
          en: "A part is the unit CodeBlock animates. A few conventions keep a change reading as one continuous slide rather than a redraw.",
          zh: "part 是 CodeBlock 动画的单位。遵循几条约定，能让改动始终读作一段连续的幻灯片，而不是整段重绘。",
        })}
      >
        <GuideList
          items={[
            {
              term: t({
                en: "An id that survives the change",
                zh: "在改动中存续的 id",
              }),
              note: t({
                en: "Give a part an id that stays the same across states, so CodeBlock slides its box to the new place instead of fading it out and back in.",
                zh: "让 part 的 id 在各状态间保持不变，CodeBlock 就会把它的盒子滑动到新位置，而不是先淡出、再淡入。",
              }),
            },
            {
              term: t({
                en: "A value keyed by its text",
                zh: "按文本取 key 的值",
              }),
              note: t({
                en: "Key a value's id by its own text, so a changed value plays as the old value leaving while the new one arrives.",
                zh: "按值本身的文本生成 id，改动的值就会播放为旧值离开、新值到达。",
              }),
            },
            {
              term: t({ en: "Line breaks in lead", zh: "换行留在 lead 中" }),
              note: t({
                en: "Keep every line break in a part's lead, never inside its tokens — a box that holds a line break has no one place to measure.",
                zh: "把每个换行都留在 part 的 lead 里，绝不放进它的 tokens——容纳换行的盒子没有单一可测量的位置。",
              }),
            },
            {
              term: t({ en: "A wide line", zh: "过宽的一行" }),
              note: t({
                en: "Let a wide line scroll inside the block instead of widening the page for it.",
                zh: "让过宽的一行在代码块内部滚动，而不是为它撑宽页面。",
              }),
            },
          ]}
        />
        <GuideNote>
          {t({
            en: "source is for a snippet that never changes: the block draws it as plain runs and skips the animation.",
            zh: "source 用于永不改动的代码片段：代码块把它绘制为普通片段，不带动画。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="code-block" />
    </>
  );
}
