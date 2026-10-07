import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";

export function TypeRoleSection() {
  const api: ApiEntry[] = [
    {
      token: "typeRole.display · subDisplay",
      meta: "3rem · 2rem · 800",
      description: t({
        en: "The one title that leads a page or a hero.",
        zh: "引领一个页面或主视觉的那一个标题。",
      }),
    },
    {
      token: "typeRole.h1 … h4",
      meta: "1.5rem … 1rem · 800 … 700",
      description: t({
        en: "Headings by rank. h4 is the title of one item, such as a card or a row.",
        zh: "按层级排列的标题。h4 是单个条目的标题，例如一张卡片或一行。",
      }),
    },
    {
      token: "typeRole.body · bodySmall",
      meta: "1rem · 0.85rem · 400 · 1.5",
      description: t({
        en: "Running text. bodySmall is for text that supports the main copy.",
        zh: "连续的正文。bodySmall 用于辅助主文案的文字。",
      }),
    },
    {
      token: "typeRole.label",
      meta: "0.85rem · 500 · 1.3",
      description: t({
        en: "A short line that names something: a field, a group, a row of metadata.",
        zh: "为某物命名的一短行：一个字段、一个分组、一行元数据。",
      }),
    },
    {
      token: "typeRole.caption · overline",
      meta: "0.75rem · 0.7rem",
      description: t({
        en: "The smallest text. overline is uppercase with wide tracking, for an eyebrow above a title.",
        zh: "最小的文字。overline 为大写、字距宽，用作标题上方的眉标。",
      }),
    },
    {
      token: "typeRole.control · controlCaption",
      meta: "1.2rem → 1rem ≥ md",
      description: t({
        en: "Text inside a control. It steps down at md together with controlSize.",
        zh: "控件内的文字。它与 controlSize 一起在 md 处变小。",
      }),
    },
    {
      token: "typeRole.fluid* · cardTitle",
      meta: "vp* · cq*",
      description: t({
        en: "fluidDisplay, fluidH1 to fluidH3 and fluidLead grow with the viewport, for a landing page. cardTitle grows with its container.",
        zh: "fluidDisplay、fluidH1 至 fluidH3 与 fluidLead 随视口变大，用于落地页。cardTitle 随其容器变大。",
      }),
    },
    {
      token: "typeModifier.numeric",
      meta: "tabular-nums",
      description: t({
        en: "Figures of one width on top of any type role, so numbers line up in a column.",
        zh: "叠加在任意字体角色之上的等宽数字，使数字在列中对齐。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Type role", zh: "字体角色" })}>
      <ShowcaseHelper>
        {t({
          en: "The job a piece of text does. Each type role sets the size, line height, weight and tracking together, so text you style yourself matches Text and Heading. Compose it first, so a later style can still change the weight. Never set a font size on its own.",
          zh: "一段文字所承担的工作。每个字体角色同时设定字号、行高、字重与字距，因此你自己设置样式的文字也与 Text 和 Heading 一致。把它放在最前面组合，后面的样式仍可改变字重。不要单独设置字号。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid>
        <Specimen token="typeRole.h3 · label">
          <div css={stack.tight}>
            <span css={typeRole.h3}>
              {t({ en: "Tonight's double bill", zh: "今晚的双片连映" })}
            </span>
            <span css={typeRole.label}>
              {t({ en: "Two films · one break", zh: "两部影片 · 一次休息" })}
            </span>
          </div>
        </Specimen>
        <Specimen token="typeRole.h1 · numeric">
          <span css={[typeRole.h1, typeModifier.numeric]}>4.8</span>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";

<span css={[typeRole.label, styles.navItem]}>Overview</span>
<span css={[typeRole.h1, typeModifier.numeric]}>4.8</span>`}
      />
    </Showcase>
  );
}
