import * as stylex from "@stylexjs/stylex";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

/** Every figure on this page is formatted for the active locale. */
function getFigureFormats() {
  const locale = getLocale();
  return {
    money: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }),
    percent: new Intl.NumberFormat(locale, { style: "percent" }),
    years: new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "year",
      unitDisplay: "long",
    }),
  };
}

/**
 * The UK repayment plans as the 2025/26 tax year sets them: the body's rows and
 * the foot's summary of them, both formatted from the one set of figures.
 */
function getPlanTable() {
  const { money, percent, years } = getFigureFormats();
  const plans = [
    {
      plan: t({ en: "Plan 1", zh: "计划 1" }),
      threshold: 26065,
      rate: 0.09,
      writtenOff: 25,
      current: false,
    },
    {
      plan: t({ en: "Plan 2", zh: "计划 2" }),
      threshold: 28470,
      rate: 0.09,
      writtenOff: 30,
      current: true,
    },
    {
      plan: t({ en: "Plan 4", zh: "计划 4" }),
      threshold: 32745,
      rate: 0.09,
      writtenOff: 30,
      current: false,
    },
    {
      plan: t({ en: "Plan 5", zh: "计划 5" }),
      threshold: 25000,
      rate: 0.09,
      writtenOff: 40,
      current: false,
    },
    {
      plan: t({ en: "Postgraduate Loan", zh: "研究生贷款" }),
      threshold: 21000,
      rate: 0.06,
      writtenOff: 30,
      current: false,
    },
  ];
  const thresholds = plans.map((plan) => plan.threshold);
  const rates = plans.map((plan) => plan.rate);
  const terms = plans.map((plan) => plan.writtenOff);
  return {
    rows: plans.map((plan) => ({
      plan: plan.plan,
      threshold: money.format(plan.threshold),
      rate: percent.format(plan.rate),
      writtenOff: years.format(plan.writtenOff),
      current: plan.current,
    })),
    // What the foot reports: the spread of each column in the body above it.
    summary: {
      threshold: money.formatRange(
        Math.min(...thresholds),
        Math.max(...thresholds),
      ),
      rate: percent.formatRange(Math.min(...rates), Math.max(...rates)),
      writtenOff: years.formatRange(Math.min(...terms), Math.max(...terms)),
    },
  };
}

/** What Plan 2 borrowers started repaying above, tax year by tax year. */
function getPlan2ThresholdRows() {
  const { money } = getFigureFormats();
  return [
    {
      year: t({ en: "2019/20", zh: "2019/20" }),
      threshold: money.format(25725),
    },
    {
      year: t({ en: "2020/21", zh: "2020/21" }),
      threshold: money.format(26575),
    },
    {
      year: t({ en: "2021/22", zh: "2021/22" }),
      threshold: money.format(27295),
    },
    {
      year: t({ en: "2022/23", zh: "2022/23" }),
      threshold: money.format(27295),
    },
    {
      year: t({ en: "2023/24", zh: "2023/24" }),
      threshold: money.format(27295),
    },
    {
      year: t({ en: "2024/25", zh: "2024/25" }),
      threshold: money.format(27295),
    },
    {
      year: t({ en: "2025/26", zh: "2025/26" }),
      threshold: money.format(28470),
    },
  ];
}

/** Balances of four and five figures, so alignment has something to prove. */
function getBalanceRows() {
  const { money } = getFigureFormats();
  return [
    { year: t({ en: "2023/24", zh: "2023/24" }), balance: money.format(45900) },
    { year: t({ en: "2024/25", zh: "2024/25" }), balance: money.format(29315) },
    { year: t({ en: "2025/26", zh: "2025/26" }), balance: money.format(8240) },
  ];
}

/** The whole component: head, body with row headers, a current row, and a foot. */
function PlanTable({
  caption,
  captionVisible = false,
  constrained = false,
}: {
  caption: string;
  captionVisible?: boolean;
  /** Caps the region well under the table's width, so it always overflows. */
  constrained?: boolean;
}) {
  const { rows, summary } = getPlanTable();
  return (
    <Table
      caption={caption}
      captionVisible={captionVisible}
      css={constrained && styles.wideTable}
      containerCss={constrained && styles.narrowRegion}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Plan", zh: "还款计划" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Threshold", zh: "起征点" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Rate", zh: "还款比例" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Written off after", zh: "免除年限" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.plan} current={row.current}>
            <TableHeaderCell scope="row">{row.plan}</TableHeaderCell>
            <TableCell numeric>{row.threshold}</TableCell>
            <TableCell numeric>{row.rate}</TableCell>
            <TableCell numeric>{row.writtenOff}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFoot>
        <TableRow>
          <TableHeaderCell scope="row">
            {t({ en: "Across all plans", zh: "全部计划" })}
          </TableHeaderCell>
          <TableCell numeric>{summary.threshold}</TableCell>
          <TableCell numeric>{summary.rate}</TableCell>
          <TableCell numeric>{summary.writtenOff}</TableCell>
        </TableRow>
      </TableFoot>
    </Table>
  );
}

/** Two columns and three rows — small enough to sit two to a row. */
function ThresholdTable({
  caption,
  captionVisible = false,
  markCurrent = false,
}: {
  caption: string;
  captionVisible?: boolean;
  markCurrent?: boolean;
}) {
  const plans = getPlanTable().rows.slice(0, 3);
  return (
    <Table caption={caption} captionVisible={captionVisible}>
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Plan", zh: "还款计划" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Threshold", zh: "起征点" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {plans.map((row) => (
          <TableRow key={row.plan} current={markCurrent && row.current}>
            <TableHeaderCell scope="row">{row.plan}</TableHeaderCell>
            <TableCell numeric>{row.threshold}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** The same balances twice over, once with `numeric` and once without. */
function BalanceTable({
  caption,
  numeric = false,
}: {
  caption: string;
  numeric?: boolean;
}) {
  const balances = getBalanceRows();
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Tax year", zh: "纳税年度" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric={numeric}>
            {t({ en: "Balance", zh: "余额" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {balances.map((row) => (
          <TableRow key={row.year}>
            <TableHeaderCell scope="row">{row.year}</TableHeaderCell>
            <TableCell numeric={numeric}>{row.balance}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Long enough to scroll under a held head. */
function ThresholdHistoryTable() {
  const years = getPlan2ThresholdRows();
  return (
    <Table
      caption={t({
        en: "Plan 2 repayment threshold by tax year",
        zh: "计划 2 各纳税年度的还款起征点",
      })}
      stickyHeader
      containerCss={styles.stickyRegion}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Tax year", zh: "纳税年度" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Threshold", zh: "起征点" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {years.map((row) => (
          <TableRow key={row.year}>
            <TableHeaderCell scope="row">{row.year}</TableHeaderCell>
            <TableCell numeric>{row.threshold}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TableShowcase() {
  const { money } = getFigureFormats();
  const planCaption = t({
    en: "UK student loan repayment plans, 2025/26",
    zh: "英国学生贷款还款计划，2025/26",
  });
  const thresholdCaption = t({
    en: "Repayment thresholds, 2025/26",
    zh: "还款起征点，2025/26",
  });

  return (
    <>
      <Showcase label={t({ en: "Anatomy", zh: "结构" })}>
        <Specimen caption={t({ en: "repayment plans", zh: "还款计划" })}>
          <PlanTable caption={planCaption} />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Every part at once: a head of column headers, a body whose rows open with a row header, three numeric columns, the row the visitor is on, and a foot summarising the spread of each column above it.",
            zh: "所有部分一次呈现：由列标题组成的表头、每行以行标题开头的主体、三个数字列、访客所在的当前行，以及汇总上方各列取值范围的表尾。",
          })}
        </Text>
        {/* Real figures need a real source, and `TableFoot` is for summarising
            the columns above it — so the provenance sits beside the table. */}
        <Text variant="bodySmall" tone="subtle" wrap="pretty" css={styles.note}>
          {t({
            en: "Figures are the 2025/26 UK repayment thresholds and rates published by the Student Loans Company.",
            zh: "数据为英国学生贷款公司发布的 2025/26 年度还款起征点与利率。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Caption", zh: "表格标题" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "caption is required. It names both the table and the scroll region around it, so a screen reader announces what the figures are instead of the word “table”. It is sr-only by default — set captionVisible when the table needs a heading on the page as well.",
            zh: "caption 是必填项。它同时为表格及其外层滚动区域命名，读屏软件因此会宣读这些数字代表什么，而不只是“表格”。它默认仅供读屏使用；当表格在页面上也需要一个标题时，请设置 captionVisible。",
          })}
        </Text>
        <SpecimenGrid>
          <Specimen caption="default">
            <ThresholdTable caption={thresholdCaption} />
          </Specimen>
          <Specimen caption="captionVisible">
            <ThresholdTable caption={thresholdCaption} captionVisible />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Numeric columns", zh: "数字列" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "numeric renders figures at a fixed width and aligns the cell to the end, so a four-figure balance and a five-figure one line up digit for digit. Set it on the column's header as well as its cells, or the header drifts away from the numbers it labels.",
            zh: "numeric 让数字以等宽呈现并使单元格靠末端对齐，因此四位数与五位数的余额也能逐位对齐。请同时为该列的标题和单元格设置它，否则标题会与其所标注的数字错位。",
          })}
        </Text>
        <SpecimenGrid>
          <Specimen caption="default">
            <BalanceTable
              caption={t({
                en: "Loan balance, plain cells",
                zh: "贷款余额，普通单元格",
              })}
            />
          </Specimen>
          <Specimen caption="numeric">
            <BalanceTable
              caption={t({
                en: "Loan balance, numeric cells",
                zh: "贷款余额，数字单元格",
              })}
              numeric
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Current row", zh: "当前行" })}>
        <Specimen caption="markCurrent">
          <ThresholdTable
            caption={t({
              en: "Repayment thresholds, with the visitor's own plan marked",
              zh: "还款起征点，并标出访客所属的计划",
            })}
            markCurrent
          />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'current puts aria-current="true" on the row and joins the tint with heavier type, so the state survives a colour-blind reading and forced-colours mode. Pass aria-current yourself to announce it as something other than "true" — "page", say, when the row is the page being read.',
            zh: 'current 会为该行加上 aria-current="true"，并在着色之外同时加粗字重，因此该状态在色盲阅读和强制颜色模式下依然可辨。若要宣读为 "true" 以外的值，请自行传入 aria-current——例如当该行正是当前阅读的页面时使用 "page"。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Sticky header", zh: "固定表头" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The head sticks to the scroll container, not to the page, so the container needs a height before anything can scroll under it. This one is capped through containerCss — scroll the rows and the column headers hold.",
            zh: "表头固定的对象是滚动容器而非页面，因此必须先给容器设定高度，才会有内容从表头下方滚过。这里的高度通过 containerCss 限制——滚动各行时，列标题会保持不动。",
          })}
        </Text>
        <Specimen caption="stickyHeader">
          <ThresholdHistoryTable />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Scroll region", zh: "滚动区域" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The table always sits in its own horizontally scrolling region, so a wide table scrolls inside its box and the page never scrolls sideways. The region is focusable, which is what makes the overflow reachable from the keyboard (WCAG 2.1.1), and it takes its accessible name from the same caption. Tab to it, then scroll with the arrow keys. The region below is capped narrow so it overflows on any screen.",
            zh: "表格始终位于自己的横向滚动区域内，因此宽表格只在自身的盒子里滚动，页面永远不会横向滚动。该区域可获得焦点，这正是溢出内容能通过键盘访问的原因（WCAG 2.1.1），其可访问名称同样来自 caption。用 Tab 聚焦后，即可用方向键滚动。下方的区域被特意收窄，因此在任何屏幕上都会溢出。",
          })}
        </Text>
        <Specimen caption="constrained">
          <PlanTable caption={planCaption} constrained />
        </Specimen>
      </Showcase>

      <Showcase label="Table" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "caption",
              type: "string",
              required: true,
              description: t({
                en: "Names the table and its scroll region. Required — an unnamed table leaves a screen reader announcing “table” and nothing else.",
                zh: "为表格及其滚动区域命名。必填——未命名的表格会让读屏软件只宣读“表格”，别无其他。",
              }),
            },
            {
              name: "captionVisible",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Renders the caption above the table. It is sr-only by default.",
                zh: "将 caption 显示在表格上方。默认仅供读屏使用。",
              }),
            },
            {
              name: "stickyHeader",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Holds TableHead at the top of the scroll container while the rows move under it. The container is what it sticks to, so give that a height through containerCss.",
                zh: "在各行从下方滚过时，将 TableHead 固定在滚动容器顶部。它固定的对象是容器，因此请通过 containerCss 为容器设定高度。",
              }),
            },
            {
              name: "containerCss",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides for the scroll container, composed last — where a height or a width cap goes.",
                zh: "最后合成的滚动容器 StyleX 覆盖样式——高度或宽度上限写在这里。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides for the <table> itself, composed last.",
                zh: "最后合成的 <table> 元素本身的 StyleX 覆盖样式。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The table's groups — TableHead, TableBody, TableFoot.",
                zh: "表格的各个分组——TableHead、TableBody、TableFoot。",
              }),
            },
            {
              name: "…table attributes",
              type: 'ComponentProps<"table">',
              description: t({
                en: "Native table attributes (id, data-*, className, style, ref) are forwarded to the <table>, not to the container.",
                zh: "原生 table 属性（id、data-*、className、style、ref）会转发到 <table>，而非容器。",
              }),
            },
            {
              name: "TableHead",
              type: 'ComponentProps<"thead">',
              description: t({
                en: "The <thead> group. Sticks when the root sets stickyHeader, and rules off from the body below it.",
                zh: "<thead> 分组。当根组件设置 stickyHeader 时固定，并与下方主体之间画出分隔线。",
              }),
            },
            {
              name: "TableBody",
              type: 'ComponentProps<"tbody">',
              description: t({
                en: "The <tbody> group holding the table's rows.",
                zh: "承载表格各行的 <tbody> 分组。",
              }),
            },
            {
              name: "TableFoot",
              type: 'ComponentProps<"tfoot">',
              description: t({
                en: "The <tfoot> group, for totals and summary rows. Rules off from the body above it.",
                zh: "<tfoot> 分组，用于合计与汇总行。与上方主体之间画出分隔线。",
              }),
            },
            {
              name: "TableRow",
              type: '{ current?: boolean } & ComponentProps<"tr">',
              defaultValue: "current: false",
              description: t({
                en: 'One <tr>. current marks the row the visitor is on: aria-current="true" alongside the tint and the heavier type, so the state never rests on colour alone. Pass aria-current yourself for any other value.',
                zh: '一个 <tr>。current 标记访客所在的行：在着色与加粗之外同时给出 aria-current="true"，使该状态不会仅靠颜色传达。若需其他取值，请自行传入 aria-current。',
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label="TableHeaderCell" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "scope",
              type: '"col" | "row" | "colgroup" | "rowgroup"',
              required: true,
              description: t({
                en: 'Which cells this header labels: "col" for a column header in the head, "row" for the label opening a body row. Required — a <th> without it leaves the association to browser guesswork. Column headers read quiet, row headers read as the row\'s label.',
                zh: '这个标题为哪些单元格命名："col" 用于表头中的列标题，"row" 用于主体行开头的标签。必填——缺少它的 <th> 只能让浏览器去猜测这层关联。列标题呈弱化样式，行标题则读作该行的标签。',
              }),
            },
            {
              name: "numeric",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Renders figures at a fixed width and end-aligns the cell. Set it on the column's header as well as its cells, or the header drifts away from the numbers it labels.",
                zh: "让数字以等宽呈现并使单元格靠末端对齐。请同时为该列的标题和单元格设置它，否则标题会与其所标注的数字错位。",
              }),
            },
            {
              name: "align",
              type: '"start" | "center" | "end"',
              defaultValue: '"start", or "end" when numeric',
              description: t({
                en: "Text alignment. An explicit align beats the alignment numeric would have chosen.",
                zh: "文本对齐方式。显式设置的 align 优先于 numeric 所选的对齐方式。",
              }),
            },
            {
              name: "…th attributes",
              type: 'Omit<ComponentProps<"th">, "align" | "scope">',
              description: t({
                en: "Native th attributes (colSpan, rowSpan, id, data-*, className, style, ref) plus css are forwarded to the <th>. The deprecated native align attribute is removed to make room for the logical one above.",
                zh: "原生 th 属性（colSpan、rowSpan、id、data-*、className、style、ref）连同 css 都会转发到 <th>。为给上面的逻辑对齐属性让路，已弃用的原生 align 属性被移除。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label="TableCell" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "numeric",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Renders figures at a fixed width and end-aligns the cell, so a column of numbers lines up digit for digit.",
                zh: "让数字以等宽呈现并使单元格靠末端对齐，使整列数字逐位对齐。",
              }),
            },
            {
              name: "align",
              type: '"start" | "center" | "end"',
              defaultValue: '"start", or "end" when numeric',
              description: t({
                en: "Text alignment. An explicit align beats the alignment numeric would have chosen.",
                zh: "文本对齐方式。显式设置的 align 优先于 numeric 所选的对齐方式。",
              }),
            },
            {
              name: "…td attributes",
              type: 'Omit<ComponentProps<"td">, "align">',
              description: t({
                en: "Native td attributes (colSpan, rowSpan, id, data-*, className, style, ref) plus css are forwarded to the <td>. The deprecated native align attribute is removed to make room for the logical one above.",
                zh: "原生 td 属性（colSpan、rowSpan、id、data-*、className、style、ref）连同 css 都会转发到 <td>。为给上面的逻辑对齐属性让路，已弃用的原生 align 属性被移除。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Table
              caption={t({
                en: "Repayment thresholds",
                zh: "还款起征点",
              })}
              captionVisible
            >
              <TableHead>
                <TableRow>
                  <TableHeaderCell scope="col">
                    {t({ en: "Plan", zh: "还款计划" })}
                  </TableHeaderCell>
                  <TableHeaderCell scope="col" numeric>
                    {t({ en: "Threshold", zh: "起征点" })}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableHeaderCell scope="row">
                    {t({ en: "Plan 2", zh: "计划 2" })}
                  </TableHeaderCell>
                  <TableCell numeric>{money.format(28470)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell scope="row">
                    {t({ en: "Plan 5", zh: "计划 5" })}
                  </TableHeaderCell>
                  <TableCell numeric>{money.format(25000)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          }
          doCaption={t({
            en: "Use it for data that is genuinely tabular: a caption naming it, a scope on every header cell, and numeric on the columns of figures.",
            zh: "用于确实是表格形态的数据：用 caption 为其命名，为每个标题单元格设置 scope，并为数字列设置 numeric。",
          })}
          dont={
            <Table caption={t({ en: "Page layout", zh: "页面布局" })}>
              <TableBody>
                <TableRow>
                  <TableCell>
                    {t({ en: "Repayment estimate", zh: "还款估算" })}
                  </TableCell>
                  <TableCell align="end">
                    {t({ en: "Start", zh: "开始" })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          }
          dontCaption={t({
            en: "Don't lay a page out with a table, and don't reach for one when you need sorting, selection, virtualisation or column resizing — those are a data grid, a different component. This one is deliberately static.",
            zh: "不要用表格来排布页面，也不要在需要排序、选择、虚拟滚动或列宽调整时使用它——那些属于数据网格，是另一个组件。本组件是刻意保持静态的。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  note: {
    maxInlineSize: "65ch",
  },
  stickyRegion: {
    blockSize: space._13,
  },
  narrowRegion: {
    maxInlineSize: space._14,
  },
  wideTable: {
    minInlineSize: space._15,
  },
});
