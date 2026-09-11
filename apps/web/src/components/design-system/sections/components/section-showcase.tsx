import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import * as stylex from "@stylexjs/stylex";
import { Chip } from "@tuja/ui/components/chip";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

export function SectionShowcase() {
  const castBody = t({
    en: "Twelve credited roles, four of them uncredited on release.",
    zh: "十二个署名角色，其中四个在上映时未署名。",
  });

  return (
    <>
      <Showcase label={t({ en: "Anatomy", zh: "结构" })}>
        <Specimen caption={t({ en: "title and icon", zh: "标题与图标" })}>
          <Section
            title={t({ en: "Cast & crew", zh: "演职人员" })}
            icon={<UsersIcon weight="bold" />}
            css={fill.inline}
          >
            <Text look="bodySmall" tone="muted">
              {castBody}
            </Text>
          </Section>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "With actions", zh: "带操作" })}>
        <Specimen caption={t({ en: "with a chip", zh: "带标签按钮" })}>
          <Section
            title={t({ en: "Similar titles", zh: "相似作品" })}
            icon={<FilmSlateIcon weight="bold" />}
            actions={
              <Chip size="sm" href="#section">
                {t({ en: "See all", zh: "查看全部" })}
              </Chip>
            }
            css={fill.inline}
          >
            <Text look="bodySmall" tone="muted">
              {t({
                en: "Actions stay in the accessibility tree and may be interactive — unlike the icon, which is decorative.",
                zh: "操作区保留在无障碍树中且可交互——与装饰性的图标不同。",
              })}
            </Text>
          </Section>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Divided", zh: "带分隔" })}>
        <Specimen
          caption={t({ en: "rule between sections", zh: "区块之间的分隔线" })}
        >
          <div css={[flex.col, fill.inline, styles.stack]}>
            <Section title={t({ en: "Overview", zh: "概览" })}>
              <Text look="bodySmall" tone="muted">
                {t({
                  en: "The first section needs no rule — nothing precedes it.",
                  zh: "第一个区块无需分隔线——它前面没有内容。",
                })}
              </Text>
            </Section>
            <Section title={t({ en: "Cast & crew", zh: "演职人员" })} divider>
              <Text look="bodySmall" tone="muted">
                {t({
                  en: "Add the rule when sections follow one another directly and the label alone isn't enough of a break.",
                  zh: "当区块紧密相连、仅靠标签不足以形成断点时，加上分隔线。",
                })}
              </Text>
            </Section>
          </div>
        </Specimen>
      </Showcase>

      <PropsTable component="section" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Section
              title={t({ en: "Cast & crew", zh: "演职人员" })}
              icon={<UsersIcon weight="bold" />}
              css={fill.inline}
            >
              <Text look="bodySmall" tone="muted">
                {castBody}
              </Text>
            </Section>
          }
          doCaption={t({
            en: "Use a Section to label a block inside a page — the quiet heading is wayfinding, and the reader's eye stays on the content.",
            zh: "用区块为页面内的一段内容加标签——轻量的标题用于导航，读者的注意力仍在内容上。",
          })}
          dont={
            <div css={[flex.col, fill.inline, styles.dontStack]}>
              <Heading level={1} look="h1">
                {t({ en: "Cast & crew", zh: "演职人员" })}
              </Heading>
              <Text look="bodySmall" tone="muted">
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
  dontStack: {
    gap: space._3,
  },
});
