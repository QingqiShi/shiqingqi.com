import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import * as stylex from "@stylexjs/stylex";
import { Chip } from "@tuja/ui/components/chip";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function SectionShowcase() {
  const castBody = t({
    en: "Twelve credited roles, four of them uncredited on release.",
    zh: "十二个署名角色，其中四个在上映时未署名。",
  });

  return (
    <>
      <Showcase label={t({ en: "Anatomy", zh: "结构" })}>
        <Section
          title={t({ en: "Cast & crew", zh: "演职人员" })}
          icon={<UsersIcon weight="bold" />}
        >
          <Text variant="bodySmall" tone="muted">
            {castBody}
          </Text>
        </Section>
      </Showcase>

      <Showcase label={t({ en: "With actions", zh: "带操作" })}>
        <Section
          title={t({ en: "Similar titles", zh: "相似作品" })}
          icon={<FilmSlateIcon weight="bold" />}
          actions={
            <Chip size="sm" href="#section">
              {t({ en: "See all", zh: "查看全部" })}
            </Chip>
          }
        >
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "Actions stay in the accessibility tree and may be interactive — unlike the icon, which is decorative.",
              zh: "操作区保留在无障碍树中且可交互——与装饰性的图标不同。",
            })}
          </Text>
        </Section>
      </Showcase>

      <Showcase label={t({ en: "Divided", zh: "带分隔" })}>
        <div css={[flex.col, styles.stack]}>
          <Section title={t({ en: "Overview", zh: "概览" })}>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "The first section needs no rule — nothing precedes it.",
                zh: "第一个区块无需分隔线——它前面没有内容。",
              })}
            </Text>
          </Section>
          <Section title={t({ en: "Cast & crew", zh: "演职人员" })} divider>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Add the rule when sections follow one another directly and the label alone isn't enough of a break.",
                zh: "当区块紧密相连、仅靠标签不足以形成断点时，加上分隔线。",
              })}
            </Text>
          </Section>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Section } from "@tuja/ui/components/section";

<Section title="Cast & crew" icon={<UsersIcon weight="bold" />}>
  <CastList people={people} />
</Section>

// Deeper in the outline, ruled off from the section before it.
<Section title="Similar titles" level={4} divider>
  <SimilarList items={items} />
</Section>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "title",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The block's label, rendered as a real heading.",
                zh: "区块的标签，渲染为真实的标题元素。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "Section body.",
                zh: "区块正文。",
              }),
            },
            {
              name: "icon",
              type: "ReactNode",
              description: t({
                en: "Decorative glyph before the label, rendered aria-hidden.",
                zh: "标签前的装饰性图标，以 aria-hidden 渲染。",
              }),
            },
            {
              name: "actions",
              type: "ReactNode",
              description: t({
                en: "Controls parked at the end of the heading row. Real content, so they stay announced and may be interactive.",
                zh: "置于标题行末尾的控件。它们是真实内容，会被朗读且可交互。",
              }),
            },
            {
              name: "level",
              type: "2 | 3 | 4 | 5 | 6",
              defaultValue: "3",
              description: t({
                en: "Heading rank for the label. Set it to keep the document outline honest when the section nests deeper.",
                zh: "标签的标题层级。当区块嵌套更深时，设置它以保持文档大纲正确。",
              }),
            },
            {
              name: "divider",
              type: "boolean",
              description: t({
                en: "Rules the section off from what precedes it.",
                zh: "用分隔线将该区块与前面的内容分开。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last so a caller can win over the defaults.",
                zh: "最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。",
              }),
            },
            {
              name: "…section attributes",
              type: 'ComponentProps<"section">',
              description: t({
                en: "Native attributes (id, aria-*, data-*, className, style, ref) are forwarded to the <section>.",
                zh: "原生属性（id、aria-*、data-*、className、style、ref）会转发到 <section> 元素。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Section
              title={t({ en: "Cast & crew", zh: "演职人员" })}
              icon={<UsersIcon weight="bold" />}
              css={styles.example}
            >
              <Text variant="bodySmall" tone="muted">
                {castBody}
              </Text>
            </Section>
          }
          doCaption={t({
            en: "Use a Section to label a block inside a page — the quiet heading is wayfinding, and the reader's eye stays on the content.",
            zh: "用区块为页面内的一段内容加标签——轻量的标题用于导航，读者的注意力仍在内容上。",
          })}
          dont={
            <div css={[flex.col, styles.example, styles.dontStack]}>
              <Heading level={1} variant="h1">
                {t({ en: "Cast & crew", zh: "演职人员" })}
              </Heading>
              <Text variant="bodySmall" tone="muted">
                {castBody}
              </Text>
            </div>
          }
          dontCaption={t({
            en: "Don't reach for Section when a block genuinely needs a prominent title — that's a Heading, and dressing one down as a section label buries it.",
            zh: "当某段内容确实需要醒目的标题时，不要使用区块——那应当是标题组件；把它弱化成区块标签只会淹没它。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._5,
  },
  example: {
    inlineSize: "100%",
  },
  dontStack: {
    gap: space._3,
  },
});
