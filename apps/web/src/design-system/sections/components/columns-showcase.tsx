import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Columns } from "@tuja/ui/components/columns";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

/** A box as narrow as a phone, so the columns in it stack. */
function NarrowFrame({ children }: { children: ReactNode }) {
  return <div css={styles.narrow}>{children}</div>;
}

export function ColumnsShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Share the width by a ratio.",
          zh: "按比例分配宽度。",
        })}
        lead={t({
          en: 'Columns sets page content side by side. ratio shares the width, first column first: "2:1" gives the main column two thirds and an aside one third.',
          zh: 'Columns 把页面内容并排放置。ratio 从第一列开始分配宽度："2:1" 让主列占三分之二，侧栏占三分之一。',
        })}
      >
        <Example fill>
          <Columns ratio="2:1">
            <Card>
              <CardTitle level={3}>
                {t({ en: "Needs you", zh: "需要你处理" })}
              </CardTitle>
            </Card>
            <Card>
              <CardTitle level={3}>
                {t({ en: "Waiting", zh: "等待中" })}
              </CardTitle>
            </Card>
          </Columns>
        </Example>
        <div css={stack.item}>
          <Specimen caption='ratio="1:1"'>
            <Columns>
              <Card>
                <Text look="bodySmall">1/2</Text>
              </Card>
              <Card>
                <Text look="bodySmall">1/2</Text>
              </Card>
            </Columns>
          </Specimen>
          <Specimen caption='ratio="1:3"'>
            <Columns ratio="1:3">
              <Card>
                <Text look="bodySmall">1/4</Text>
              </Card>
              <Card>
                <Text look="bodySmall">3/4</Text>
              </Card>
            </Columns>
          </Specimen>
          <Specimen caption='ratio="1:1:1"'>
            <Columns ratio="1:1:1">
              <Card>
                <Text look="bodySmall">1/3</Text>
              </Card>
              <Card>
                <Text look="bodySmall">1/3</Text>
              </Card>
              <Card>
                <Text look="bodySmall">1/3</Text>
              </Card>
            </Columns>
          </Specimen>
        </div>
        <GuideNote>
          {t({
            en: "Each child is one column. To stack several cards in one column, wrap them in one element.",
            zh: "每个子元素是一列。若要在一列中堆叠多张卡片，请把它们包在一个元素中。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Stack where the box is narrow, not the screen.",
          zh: "在容器变窄时堆叠，而不是看屏幕。",
        })}
        lead={t({
          en: "Below a width of 44rem, the columns stack into one, in reading order. Columns measures its own width, so it stacks the same way in a narrow pane beside a sidebar as on a phone.",
          zh: "宽度小于 44rem 时，各列按阅读顺序堆叠成一列。Columns 测量的是自身宽度，因此在侧栏旁的窄窗格中与在手机上一样会堆叠。",
        })}
      >
        <Specimen
          stage={NarrowFrame}
          caption={t({ en: "in a box 20rem wide", zh: "在 20rem 宽的容器中" })}
        >
          <Columns ratio="2:1">
            <Card>
              <Text look="bodySmall">
                {t({ en: "Main column", zh: "主列" })}
              </Text>
            </Card>
            <Card>
              <Text look="bodySmall">{t({ en: "Aside", zh: "侧栏" })}</Text>
            </Card>
          </Columns>
        </Specimen>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Set fields side by side with the item gap.",
          zh: "并排的字段使用 item 间距。",
        })}
        lead={t({
          en: 'The default gap sets cards and sections apart. gap="item" is the closer space between the fields of one form.',
          zh: '默认间距用于分开卡片与分区。gap="item" 是同一表单中各字段之间更紧凑的间距。',
        })}
      >
        <Specimen caption='gap="item"'>
          <Columns gap="item">
            <TextField
              label={t({ en: "Amount", zh: "金额" })}
              inputMode="decimal"
              leading="£"
              defaultValue="64.50"
            />
            <TextField
              label={t({ en: "Date", zh: "日期" })}
              type="date"
              defaultValue="2026-11-10"
            />
          </Columns>
        </Specimen>
      </GuideSection>

      <PropsTable component="columns" />
    </>
  );
}

const styles = stylex.create({
  narrow: {
    maxInlineSize: "20rem",
  },
});
