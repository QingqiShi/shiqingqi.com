import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import {
  LedgerList,
  ListDetailList,
  ReorderList,
  ReportList,
  SpendingList,
  UncategorisedList,
} from "./list-specimens.tsx";

export function ListShowcase() {
  return (
    <>
      <Showcase
        label={t({ en: "When to use it", zh: "何时使用" })}
        leadsWithText
      >
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Use List for every list of rows that each open something: settings, reports, accounts, the entries of a ledger. The look of a row is not an option, so a row that can be tapped looks the same on every screen, and a reader learns it once.",
            zh: "凡是每一行都能打开某个内容的列表，都使用 List：设置、报告、账户、账本中的条目。行的外观不是可选项，因此可点按的行在每个界面上看起来都一样，读者只需认识一次。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Do not use it for a menu, which is another component. The links of a sidebar are a Nav list.",
            zh: "不要把它用于菜单，菜单属于其他组件。侧栏里的链接请使用导航列表（NavList）。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Links and buttons", zh: "链接与按钮" })}>
        <Specimen caption='href, aria-current="page"'>
          <ReportList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'With href, the row is a link, so a modifier key opens it in a new tab, and linkComponent takes the framework\'s link. With onClick, it is a button across its whole width. aria-current="page" marks the row being read and gives it the selected fill. With neither, the row opens nothing and has no caret, for a line that only reads among rows that open.',
            zh: '传入 href 时，整行是一个链接，因此按住修饰键可以在新标签页中打开，linkComponent 接收框架自带的链接组件。传入 onClick 时，整行是一个横跨全宽的按钮。aria-current="page" 标记当前正在阅读的行，并为其加上选中填充。两者都不传时，该行不打开任何内容，也没有箭头，用于可打开的行之间一条只供阅读的行。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "One line or two", zh: "一行或两行" })}>
        <Specimen caption="leadingShape, detail, extra, value, valueDetail">
          <SpendingList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A row of only a name centres every part. With a detail line, the name and the value share the top line, and the leading item stays centred on the first two lines, so a note in extra does not move it.",
            zh: "只有名称的行，各部分都垂直居中。有说明行时，名称与 value 共用首行，前置项始终居中于前两行，因此 extra 中的备注不会移动它。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A name too long for its line ends in an ellipsis. Where a cut name would hide what the row is about, such as an e-mail address, set wrap: the name and the detail line wrap, and the other parts stay level with the first two lines.",
            zh: "名称超出一行时以省略号结尾。若截断会让人看不出这一行是什么（例如电子邮件地址），请设置 wrap：名称与说明行会换行，其余部分仍与前两行对齐。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "leadingSize, or leadingShape alone, puts the leading item in a box of one size, so the names start on one line. Such a row is as tall as a row with a detail line, so a list of both keeps one row height.",
            zh: "leadingSize（或单独使用 leadingShape）把前置项放进统一尺寸的框内，使各行名称从同一条线开始。这样的行与有说明行的行同高，因此两种行混排时行高一致。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Plain form", zh: "简洁形式" })}>
        <Specimen caption='form="plain"'>
          <LedgerList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'Inside a card or a section that has its own surface, form="plain" drops the border and the dividers. Each row shows a rounded plate under the pointer, and the list reaches into the gutter, so its text lines up with the title above it.',
            zh: '在已有自身表面的卡片或分区中，form="plain" 去掉边框与分隔线。指针悬停时每行显示一块圆角底板，列表伸入两侧留白，使各行文字与上方标题对齐。',
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

      <Showcase label={t({ en: "Below the row", zh: "行下方" })}>
        <Specimen caption="below">
          <UncategorisedList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "below puts content under the row, outside the part that opens it, such as a Select that picks a category in place. It starts where the name starts and runs to the end of the row, so it does not squeeze the row on a phone.",
            zh: "below 把内容放在行下方、打开该行的区域之外，例如就地选择分类的 Select。它从名称的起点开始，延伸到行尾，因此在手机上不会挤压该行。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Beside a detail pane", zh: "在详情面板旁" })}>
        <Specimen caption='density="compact", caret={false}'>
          <ListDetailList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "The caret says the row opens in place of the list. Where it opens beside the list, as in a list and detail layout, set caret={false}, and mark the open row with aria-current.",
            zh: "箭头表示该行会在列表的位置打开。若在列表旁打开（例如列表与详情并排的布局），请设置 caret={false}，并用 aria-current 标记已打开的行。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'A list beside the content is a sidebar, which a reader scans: density="compact" sets its rows in smaller type, so more of each name fits. The rows keep their alignment and stay 48px tall or more.',
            zh: '内容旁的列表就是侧栏，读者会快速浏览它：density="compact" 以更小的字号显示各行，使名称能显示得更完整。各行的对齐方式不变，行高仍至少为 48px。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";

<List aria-label="Spending">
  <ListRow
    href="/spending/groceries"
    linkComponent={Link}
    leading="🛒"
    leadingShape="circle"
    detail="Market Street · Card"
    value="-£42.10"
  >
    Groceries
  </ListRow>
</List>`}
          label="tsx"
        />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "For an item that is not a row, such as a loading placeholder, build it from listSurface in @tuja/ui/components/list.stylex: item draws the divider, and row sets the height and the padding of a row. withMedia gives it the height of a row with a sized leading item, and listRowSizes holds the sizes of that item, so a skeleton row takes the same place. On a list you build yourself, plain and compact set the form and the density.",
            zh: "对于不是行的条目（例如加载占位），用 @tuja/ui/components/list.stylex 中的 listSurface 构建：item 绘制分隔线，row 设定行的高度与内边距。withMedia 使其与带尺寸前置项的行同高，listRowSizes 包含该前置项的尺寸，使骨架行占据相同位置。在自行构建的列表上，plain 和 compact 分别设定形式与密度。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="list" />

      <PropsTable component="list-row" />
    </>
  );
}
