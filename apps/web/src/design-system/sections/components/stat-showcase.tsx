import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Stat } from "@tuja/ui/components/stat";
import { StatGroup } from "@tuja/ui/components/stat-group";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function StatShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Show the few figures a page is about.",
          zh: "展示页面所关注的几个数字。",
        })}
        lead={t({
          en: "A Stat is one figure in large type, with a label above it and a line of context below. A StatGroup sets a few of them in a row, each on a card of its own.",
          zh: "一个 Stat 是一个大字号的数字，上方是标签，下方是一行背景说明。StatGroup 把几个 Stat 排成一行，每个都在自己的卡片上。",
        })}
      >
        <Example fill>
          <StatGroup>
            <Stat
              label={t({ en: "Spent", zh: "支出" })}
              value="£2,184.20"
              detail={t({
                en: "£312 less than October",
                zh: "比十月少 £312",
              })}
            />
            <Stat
              label={t({ en: "Income", zh: "收入" })}
              value="£4,250.00"
              detail={t({ en: "2 payments", zh: "2 笔入账" })}
            />
            <Stat
              label={t({ en: "Saved", zh: "储蓄" })}
              value="£1,200.00"
              detail={t({ en: "28% of income", zh: "收入的 28%" })}
            />
          </StatGroup>
        </Example>
        <GuideNote>
          {t({
            en: "The group fits as many columns as its own width holds. On a phone, two stats share a row, and a last stat alone takes the whole row.",
            zh: "统计组按自身宽度放下尽可能多的列。在手机上两个统计项共用一行，最后单独一项则占满整行。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Colour a figure only when it means something.",
          zh: "只在数字有含义时为它着色。",
        })}
        lead={t({
          en: "intent colours the figure: success for a good result, danger for a loss, warning for something that needs a look. Say the same in the label or the detail, because colour alone does not reach everyone.",
          zh: "intent 为数字着色：success 表示好的结果，danger 表示亏损，warning 表示需要查看的事。同时要在标签或说明中写明同样的意思，因为仅靠颜色并不能传达给所有人。",
        })}
      >
        <Specimen caption='intent="success", intent="warning"'>
          <StatGroup>
            <Stat
              label={t({ en: "Net", zh: "净额" })}
              value="+£2,065.80"
              intent="success"
              detail={t({ en: "More in than out", zh: "收入多于支出" })}
            />
            <Stat
              label={t({ en: "Needs a category", zh: "待分类" })}
              value="3"
              intent="warning"
              detail={t({ en: "From the bank sync", zh: "来自银行同步" })}
            />
          </StatGroup>
        </Specimen>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Drop the cards inside a card.",
          zh: "在卡片内去掉卡片。",
        })}
        lead={t({
          en: 'Where the stats already sit on a surface, look="plain" sets them on it, with more space between them in place of the cards.',
          zh: '统计项已经位于某个表面上时，look="plain" 把它们直接放在该表面上，以更大的间距代替卡片。',
        })}
      >
        <Example fill>
          <Card>
            <CardHeader>
              <CardTitle level={3}>
                {t({ en: "Last 7 days", zh: "最近 7 天" })}
              </CardTitle>
            </CardHeader>
            <StatGroup look="plain">
              <Stat label={t({ en: "Filed", zh: "已归档" })} value="148" />
              <Stat label={t({ en: "Archived", zh: "已存档" })} value="41" />
              <Stat label={t({ en: "Junk", zh: "垃圾邮件" })} value="19" />
            </StatGroup>
          </Card>
        </Example>
      </GuideSection>

      <PropsTable component="stat-group" />

      <PropsTable component="stat" />
    </>
  );
}
