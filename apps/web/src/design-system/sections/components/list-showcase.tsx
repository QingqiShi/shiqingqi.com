import { Text } from "@tuja/ui/components/text";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import {
  ListDetailList,
  PeopleList,
  ReorderList,
  ReportList,
  SettingsList,
} from "./list-specimens.tsx";

export function ListShowcase() {
  return (
    <>
      <Showcase label={t({ en: "When to use it", zh: "何时使用" })}>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Use List for every list of rows that each open something: settings, reports, accounts, members. The surface, the dividers and the caret are not options, so a row that can be tapped looks the same on every screen, and a reader learns it once.",
            zh: "凡是每一行都能打开某个内容的列表，都使用 List：设置、报告、账户、成员。表面、分隔线和箭头都不是可选项，因此可点按的行在每个界面上看起来都一样，读者只需认识一次。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Do not use it for a long feed such as a list of transactions, which needs its own density and grouping, for a navigation rail, or for a menu. Those are other components.",
            zh: "不要把它用于长信息流（例如交易列表，它需要自己的密度与分组）、导航栏或菜单。这些属于其他组件。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Button rows", zh: "按钮行" })}>
        <Specimen caption="onClick, detail, trailing">
          <SettingsList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "With onClick, the row is a button across its whole width. detail puts a muted line under the name, and trailing puts a Badge or a figure at the end, before the caret. The name and the detail each stay on one line and end in an ellipsis.",
            zh: "传入 onClick 时，整行是一个横跨全宽的按钮。detail 在名称下方放一行弱化文字，trailing 在末尾、箭头之前放置 Badge 或数字。名称与 detail 各占一行，超出时以省略号结尾。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Link rows", zh: "链接行" })}>
        <Specimen caption='href, aria-current="page"'>
          <ReportList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'With href, the row is a link, so a modifier key opens it in a new tab. linkComponent takes the framework\'s link, so following a row stays client-side. aria-current="page" marks the row being read and gives it the selected fill.',
            zh: '传入 href 时，整行是一个链接，因此按住修饰键可以在新标签页中打开。linkComponent 接收框架自带的链接组件，使打开行时保持客户端导航。aria-current="page" 标记当前正在阅读的行，并为其加上选中填充。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Leading and trailing", zh: "前置与后置" })}>
        <Specimen caption="leading, trailing">
          <PeopleList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "leading puts an Avatar or an icon before the name. An amount in trailing takes numeric figures, so the amounts line up from row to row.",
            zh: "leading 在名称之前放置 Avatar 或图标。放在 trailing 中的金额使用等宽数字，使各行金额上下对齐。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Actions", zh: "操作按钮" })}>
        <Specimen caption="actions">
          <ReorderList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "actions puts buttons beside the row, outside the part that opens it, so a press on Move up never opens the row. A row with actions shows no caret. Give each button a name that includes the row's, because a screen reader reads it on its own.",
            zh: "actions 把按钮放在行旁，位于打开该行的区域之外，因此按下「上移」不会打开该行。有操作按钮的行不显示箭头。每个按钮的名称都要包含该行的名称，因为读屏软件会单独读出它。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Beside a detail pane", zh: "在详情面板旁" })}>
        <Specimen caption="caret={false}">
          <ListDetailList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "The caret says the row opens in place of the list. Where it opens beside the list, as in a list and detail layout, set caret={false}, and mark the open row with aria-current.",
            zh: "箭头表示该行会在列表的位置打开。若在列表旁打开（例如列表与详情并排的布局），请设置 caret={false}，并用 aria-current 标记已打开的行。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";

<List aria-label="Reports">
  <ListRow
    href="/reports/march"
    linkComponent={Link}
    detail="Spending by category"
    trailing={<Badge intent="neutral">Last week</Badge>}
  >
    March spending
  </ListRow>
</List>`}
          label="tsx"
        />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "For an item that is not a row, such as a loading placeholder, build it from listSurface in @tuja/ui/components/list.stylex: item draws the divider, and row sets the height and the padding of a row.",
            zh: "对于不是行的条目（例如加载占位），用 @tuja/ui/components/list.stylex 中的 listSurface 构建：item 绘制分隔线，row 设定行的高度与内边距。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="list" />

      <PropsTable component="list-row" />
    </>
  );
}
