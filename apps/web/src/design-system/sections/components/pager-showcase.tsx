import { t } from "@tuja/i18n";
import { Pager } from "@tuja/ui/components/pager";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function PagerShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "End a page in a sequence with it.",
          zh: "把它放在连续页面的末尾。",
        })}
        lead={t({
          en: "Pager links to the page before and the page after, so a reader can go through the pages in order. Each link is one target: hover over it or tab to it, and the whole of it answers.",
          zh: "Pager 链接到上一页和下一页，读者可以按顺序读下去。每个链接都是一个完整的目标：悬停在它上面或用 Tab 键移到它上面，它会整体响应。",
        })}
      >
        <Example>
          <Pager
            aria-label={t({
              en: "Previous and next pages",
              zh: "上一页与下一页",
            })}
            previous={{
              href: "#",
              label: t({ en: "Previous", zh: "上一页" }),
              title: t({ en: "Set up your project", zh: "设置项目" }),
            }}
            next={{
              href: "#",
              label: t({ en: "Next", zh: "下一页" }),
              title: t({ en: "Build your first page", zh: "搭建第一个页面" }),
            }}
          />
        </Example>
        <GuideNote>
          {t({
            en: "The fill hangs outside the column, so at rest the carets line up with the column.",
            zh: "底色悬出栏外，因此静止时箭头与栏对齐。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Keep a link in place when the other is missing.",
          zh: "另一侧缺失时，链接留在原位。",
        })}
        lead={t({
          en: "The first page has no previous, and the last page has no next. Leave that side out, and the other link stays in its own column, so it does not move from page to page.",
          zh: "第一页没有上一页，最后一页没有下一页。省略这一侧，另一侧的链接仍留在自己那一列，翻页时位置不变。",
        })}
      >
        <Specimen caption={t({ en: "first page", zh: "第一页" })}>
          <Pager
            aria-label={t({ en: "Next page", zh: "下一页" })}
            next={{
              href: "#",
              label: t({ en: "Next", zh: "下一页" }),
              title: t({ en: "Set up your project", zh: "设置项目" }),
            }}
          />
        </Specimen>
      </GuideSection>

      <PropsTable component="pager" />
    </>
  );
}
