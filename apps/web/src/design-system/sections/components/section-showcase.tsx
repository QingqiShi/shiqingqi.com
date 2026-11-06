import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Section } from "@tuja/ui/components/section";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

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
            description={castBody}
          />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "With actions", zh: "带操作" })}>
        <Specimen caption={t({ en: "with a link", zh: "带链接" })}>
          <Section
            title={t({ en: "Similar titles", zh: "相似作品" })}
            icon={<FilmSlateIcon weight="bold" />}
            actions={
              <Button look="outline" size="xs" href="#section">
                {t({ en: "See all", zh: "查看全部" })}
              </Button>
            }
            css={fill.inline}
            description={t({
              en: "Actions stay in the accessibility tree and may be interactive — unlike the icon, which is decorative.",
              zh: "操作区保留在无障碍树中且可交互——与装饰性的图标不同。",
            })}
          />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Divided", zh: "带分隔" })}>
        <Specimen
          caption={t({ en: "rule between sections", zh: "区块之间的分隔线" })}
        >
          <div css={[stack.group, fill.inline]}>
            <Section
              title={t({ en: "Overview", zh: "概览" })}
              description={t({
                en: "The first section needs no rule — nothing precedes it.",
                zh: "第一个区块无需分隔线——它前面没有内容。",
              })}
            />
            <Section
              title={t({ en: "Cast & crew", zh: "演职人员" })}
              divider
              description={t({
                en: "Add the rule when sections follow one another directly and the label alone isn't enough of a break.",
                zh: "当区块紧密相连、仅靠标签不足以形成断点时，加上分隔线。",
              })}
            />
          </div>
        </Specimen>
      </Showcase>

      <PropsTable component="section" />
    </>
  );
}
