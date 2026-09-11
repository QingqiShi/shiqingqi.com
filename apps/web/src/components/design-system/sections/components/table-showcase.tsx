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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Every part at once: a head of column headers, a body whose rows open with a row header, three numeric columns, the row the visitor is on, and a foot summarising the spread of each column above it.",
            zh: "所有部分一次呈现：由列标题组成的表头、每行以行标题开头的主体、三个数字列、访客所在的当前行，以及汇总上方各列取值范围的表尾。",
          })}
        </Text>
        {/* Real figures need a real source, and `TableFoot` is for summarising
            the columns above it — so the provenance sits beside the table. */}
        <Text look="bodySmall" tone="subtle" wrap="pretty" css={styles.note}>
          {t({
            en: "Figures are the 2025/26 UK repayment thresholds and rates published by the Student Loans Company.",
            zh: "数据为英国学生贷款公司发布的 2025/26 年度还款起征点与利率。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Caption", zh: "表格标题" })}>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'current puts aria-current="true" on the row and joins the tint with heavier type, so the state survives a colour-blind reading and forced-colours mode. Pass aria-current yourself to announce it as something other than "true" — "page", say, when the row is the page being read.',
            zh: 'current 会为该行加上 aria-current="true"，并在着色之外同时加粗字重，因此该状态在色盲阅读和强制颜色模式下依然可辨。若要宣读为 "true" 以外的值，请自行传入 aria-current——例如当该行正是当前阅读的页面时使用 "page"。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Sticky header", zh: "固定表头" })}>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The table always sits in its own horizontally scrolling region, so a wide table scrolls inside its box and the page never scrolls sideways. The region is focusable, which is what makes the overflow reachable from the keyboard (WCAG 2.1.1), and it takes its accessible name from the same caption. Tab to it, then scroll with the arrow keys. The region below is capped narrow so it overflows on any screen.",
            zh: "表格始终位于自己的横向滚动区域内，因此宽表格只在自身的盒子里滚动，页面永远不会横向滚动。该区域可获得焦点，这正是溢出内容能通过键盘访问的原因（WCAG 2.1.1），其可访问名称同样来自 caption。用 Tab 聚焦后，即可用方向键滚动。下方的区域被特意收窄，因此在任何屏幕上都会溢出。",
          })}
        </Text>
        <Specimen caption="constrained">
          <PlanTable caption={planCaption} constrained />
        </Specimen>
      </Showcase>

      <PropsTable component="table" />

      <PropsTable component="table-head" />

      <PropsTable component="table-body" />

      <PropsTable component="table-foot" />

      <PropsTable component="table-row" />

      <PropsTable component="table-header-cell" />

      <PropsTable component="table-cell" />

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
