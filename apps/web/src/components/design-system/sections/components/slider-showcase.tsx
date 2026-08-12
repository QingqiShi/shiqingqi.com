"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Slider } from "@tuja/ui/components/slider";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

/** A money readout — the figure a budget slider exists to name. */
function BudgetSlider() {
  const locale = useLocale();
  const [budget, setBudget] = useState(2400);
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <Slider
      label={t({ en: "Monthly budget", zh: "每月预算" })}
      description={t({
        en: "Rent, bills, and everything else you expect to spend each month.",
        zh: "房租、账单，以及每月预计的其他开销。",
      })}
      min={500}
      max={6000}
      step={50}
      value={budget}
      onChange={setBudget}
      readout={money.format(budget)}
    />
  );
}

/** A whole-number term and a rate that steps in quarters. */
function BoundedSliders() {
  const locale = useLocale();
  const [term, setTerm] = useState(25);
  const [rate, setRate] = useState(4.25);
  const years = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "year",
    unitDisplay: "long",
  });
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 2,
  });
  return (
    <div css={styles.stack}>
      <Slider
        label={t({ en: "Term", zh: "贷款期限" })}
        min={5}
        max={35}
        step={1}
        value={term}
        onChange={setTerm}
        readout={years.format(term)}
      />
      <Slider
        label={t({ en: "Interest rate", zh: "利率" })}
        min={1}
        max={9}
        step={0.25}
        value={rate}
        onChange={setRate}
        readout={percent.format(rate / 100)}
      />
    </div>
  );
}

interface KeyHintProps {
  /** One cluster of interchangeable keys, as a reader would press them. */
  keys: string[];
  effect: string;
}

/** One key cluster and what pressing it does. */
function KeyHint({ keys, effect }: KeyHintProps) {
  return (
    <div css={styles.keyRow}>
      <dt css={styles.keyCluster}>
        {keys.map((key) => (
          <kbd key={key} css={[corner.radius_1, styles.key]}>
            {key}
          </kbd>
        ))}
      </dt>
      <dd css={styles.keyEffect}>{effect}</dd>
    </div>
  );
}

interface MeterProps {
  /** The callback's name, shown as written in the API. */
  name: string;
  callsLabel: string;
  calls: string;
  valueLabel: string;
  value: string;
}

/** One callback's tally: how many times it fired, and what it last reported. */
function Meter({ name, callsLabel, calls, valueLabel, value }: MeterProps) {
  return (
    <div css={[corner.radius_2, styles.meter]}>
      <span css={styles.meterName}>{name}</span>
      <span css={styles.meterStat}>
        <span css={styles.meterLabel}>{callsLabel}</span>
        <span css={styles.meterFigure}>{calls}</span>
      </span>
      <span css={styles.meterStat}>
        <span css={styles.meterLabel}>{valueLabel}</span>
        <span css={styles.meterFigure}>{value}</span>
      </span>
    </div>
  );
}

/** Counts both callbacks so the stream and the settle are visible side by side. */
function ChangeVersusCommit() {
  const locale = useLocale();
  const [value, setValue] = useState(40);
  const [changes, setChanges] = useState(0);
  const [committed, setCommitted] = useState(40);
  const [commits, setCommits] = useState(0);
  const count = new Intl.NumberFormat(locale);
  return (
    <div css={styles.stack}>
      <Slider
        label={t({
          en: "Drag me, or step me with the arrows",
          zh: "拖动我，或用方向键步进",
        })}
        value={value}
        onChange={(next) => {
          setValue(next);
          setChanges((fired) => fired + 1);
        }}
        onCommit={(next) => {
          setCommitted(next);
          setCommits((fired) => fired + 1);
        }}
        readout={count.format(value)}
      />
      <div css={styles.meters}>
        <Meter
          name="onChange"
          callsLabel={t({ en: "Calls", zh: "调用次数" })}
          calls={count.format(changes)}
          valueLabel={t({ en: "Live value", zh: "实时数值" })}
          value={count.format(value)}
        />
        <Meter
          name="onCommit"
          callsLabel={t({ en: "Calls", zh: "调用次数" })}
          calls={count.format(commits)}
          valueLabel={t({ en: "Settled value", zh: "落定数值" })}
          value={count.format(committed)}
        />
      </div>
    </div>
  );
}

/** The label / labelHidden / description / error contract, one slider each. */
function FieldContractSliders() {
  const locale = useLocale();
  const [overpayment, setOverpayment] = useState(150);
  const [risk, setRisk] = useState(3);
  const [deposit, setDeposit] = useState(4);
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const percent = new Intl.NumberFormat(locale, { style: "percent" });
  const count = new Intl.NumberFormat(locale);
  const riskLabel = t({ en: "Risk tolerance", zh: "风险承受度" });
  const depositError = t({
    en: "A deposit under 5% is outside this lender's range.",
    zh: "首付低于 5% 超出了这家放贷方的范围。",
  });
  return (
    <div css={styles.stack}>
      <Slider
        label={t({ en: "Monthly overpayment", zh: "每月额外还款" })}
        description={t({
          en: "Paid on top of the scheduled instalment. Shortens the term.",
          zh: "在计划还款额之外额外支付，可以缩短还款期限。",
        })}
        min={0}
        max={800}
        step={25}
        value={overpayment}
        onChange={setOverpayment}
        readout={money.format(overpayment)}
      />
      <div css={styles.namedGroup}>
        <Text as="span" variant="bodySmall" weight="semibold">
          {riskLabel}
        </Text>
        <Slider
          label={riskLabel}
          labelHidden
          min={1}
          max={5}
          step={1}
          value={risk}
          onChange={setRisk}
          readout={count.format(risk)}
        />
      </div>
      <Slider
        label={t({ en: "Deposit", zh: "首付比例" })}
        min={0}
        max={40}
        step={1}
        value={deposit}
        onChange={setDeposit}
        readout={percent.format(deposit / 100)}
        error={deposit < 5 ? depositError : undefined}
      />
    </div>
  );
}

/** Nothing to drag — the keyboard is the only way in and out of this one. */
function KeyboardSlider() {
  const locale = useLocale();
  const [value, setValue] = useState(50);
  const count = new Intl.NumberFormat(locale);
  return (
    <Slider
      label={t({ en: "Focus me, then press a key", zh: "先聚焦，再按键试试" })}
      min={0}
      max={100}
      step={5}
      value={value}
      onChange={setValue}
      readout={count.format(value)}
    />
  );
}

/** The Do panel's slider: the exact figure is on screen and follows the thumb. */
function ReadoutSlider() {
  const locale = useLocale();
  const [amount, setAmount] = useState(180000);
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <Slider
      label={t({ en: "Loan amount", zh: "贷款金额" })}
      min={50000}
      max={400000}
      step={5000}
      value={amount}
      onChange={setAmount}
      readout={money.format(amount)}
      css={fill.inline}
    />
  );
}

/** A slider locked to its value — the readout still says what that value is. */
function DisabledSlider() {
  const locale = useLocale();
  const percent = new Intl.NumberFormat(locale, { style: "percent" });

  return (
    <Slider
      label={t({ en: "Overpayment", zh: "额外还款" })}
      description={t({
        en: "Unlocked once the fixed-rate period ends.",
        zh: "固定利率期结束后才可调整。",
      })}
      disabled
      defaultValue={35}
      readout={percent.format(0.35)}
    />
  );
}

export function SliderShowcase() {
  const smallLabel = t({ en: "Small", zh: "小" });
  const mediumLabel = t({ en: "Medium", zh: "中" });
  const largeLabel = t({ en: "Large", zh: "大" });
  const hints = [
    {
      keys: ["←", "→", "↑", "↓"],
      effect: t({ en: "Moves by one step.", zh: "移动一个步长。" }),
    },
    {
      keys: ["Home", "End"],
      effect: t({ en: "Jumps to min or to max.", zh: "跳到 min 或 max。" }),
    },
    {
      keys: ["PageUp", "PageDown"],
      effect: t({
        en: "Jumps by a larger increment the browser picks.",
        zh: "按浏览器选定的较大幅度跳变。",
      }),
    },
  ];
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Slider
              size="sm"
              label={smallLabel}
              labelHidden
              defaultValue={60}
              css={fill.inline}
            />
          </Specimen>
          <Specimen caption="md">
            <Slider
              size="md"
              label={mediumLabel}
              labelHidden
              defaultValue={60}
              css={fill.inline}
            />
          </Specimen>
          <Specimen caption="lg">
            <Slider
              size="lg"
              label={largeLabel}
              labelHidden
              defaultValue={60}
              css={fill.inline}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Readout", zh: "数值显示" })}>
        <div css={styles.stack}>
          <Text
            variant="bodySmall"
            tone="muted"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "readout is a slot, not a formatter: the Slider places whatever you pass opposite the label, and leaves the currency, the units, and the decimal places to you. Build the string with Intl.NumberFormat so it follows the reader's locale.",
              zh: "readout 是一个插槽，而不是格式化器：滑块只把你传入的内容放到标签对面，货币、单位和小数位都由你决定。请用 Intl.NumberFormat 生成字符串，让它跟随读者的地区设置。",
            })}
          </Text>
          <div css={styles.column}>
            <Specimen caption={t({ en: "currency", zh: "货币" })}>
              <BudgetSlider />
            </Specimen>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Range and step", zh: "范围与步长" })}>
        <div css={styles.stack}>
          <Text
            variant="bodySmall"
            tone="muted"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "min, max, and step default to 0, 100, and 1. An uncontrolled Slider with no defaultValue starts at min, so a range that does not begin at zero still opens on a real value.",
              zh: "min、max 与 step 的默认值分别是 0、100 和 1。未设置 defaultValue 的非受控滑块从 min 开始，因此起点不为零的范围也能以一个真实数值打开。",
            })}
          </Text>
          <div css={styles.column}>
            <Specimen caption={t({ en: "term and rate", zh: "期限与利率" })}>
              <BoundedSliders />
            </Specimen>
          </div>
        </div>
      </Showcase>

      <Showcase label="onChange / onCommit" labelVariant="code">
        <div css={styles.stack}>
          <Text
            variant="bodySmall"
            weight="semibold"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "Drive expensive recomputation from onCommit, not from onChange.",
              zh: "把开销大的重算交给 onCommit，而不是 onChange。",
            })}
          </Text>
          <Text
            variant="bodySmall"
            tone="muted"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "onChange streams every move of a drag, which is what the visible value should track. onCommit fires once, when the interaction ends — a pointer release, a key release, or focus leaving mid-gesture — and never fires at all if nothing moved. Drag the thumb across the track and watch the two tallies diverge.",
              zh: "onChange 会在拖动的每一次移动时触发，可见数值应当跟随它。onCommit 只在交互结束时触发一次——松开指针、松开按键，或在手势中途失去焦点——而且如果数值没有变化就完全不会触发。把滑块拖过整条轨道，看看两边的计数如何拉开。",
            })}
          </Text>
          <div css={styles.column}>
            <Specimen caption={t({ en: "live vs settled", zh: "实时与落定" })}>
              <ChangeVersusCommit />
            </Specimen>
          </div>
        </div>
      </Showcase>

      <Showcase
        label={t({ en: "Label, description, error", zh: "标签、说明与错误" })}
      >
        <div css={styles.stack}>
          <Text
            variant="bodySmall"
            tone="muted"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "Slider carries the same field contract as TextField and Checkbox. label is required and lands on the input itself; labelHidden keeps it in the accessibility tree when a nearby cue already names the control; description is wired through aria-describedby; error turns the track danger-coloured, sets aria-invalid, and announces itself. Drag the deposit to 5% or above to clear its error.",
              zh: "滑块与文本框、复选框共用同一套字段契约。label 必填，直接落在 input 上；当附近已有提示为控件命名时，labelHidden 会把它保留在无障碍树中；description 通过 aria-describedby 关联；error 会把轨道变为危险色、设置 aria-invalid 并主动播报。把首付比例拖到 5% 或以上即可清除错误。",
            })}
          </Text>
          <div css={styles.column}>
            <Specimen
              caption={t({
                en: "overpayment, risk, deposit",
                zh: "额外还款、风险、首付",
              })}
            >
              <FieldContractSliders />
            </Specimen>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Disabled", zh: "禁用" })}>
        <div css={styles.column}>
          <Specimen caption={t({ en: "overpayment", zh: "额外还款" })}>
            <DisabledSlider />
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Keyboard", zh: "键盘操作" })}>
        <div css={styles.stack}>
          <Text
            variant="bodySmall"
            tone="muted"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "Stepping comes from the platform, not from this component: the Slider is a native range input with its chrome restyled, and it never calls preventDefault on a key. That buys the full set of shortcuts, plus focus and value announcement, for free.",
              zh: "步进来自平台，而不是这个组件：滑块本身就是一个重新绘制外观的原生 range 输入，并且从不对按键调用 preventDefault。因此整套快捷键，连同焦点与数值播报，都是白得的。",
            })}
          </Text>
          <dl css={styles.keyList}>
            {hints.map((hint) => (
              <KeyHint
                key={hint.keys.join("")}
                keys={hint.keys}
                effect={hint.effect}
              />
            ))}
          </dl>
          <div css={styles.column}>
            <Specimen caption={t({ en: "defaults", zh: "默认值" })}>
              <KeyboardSlider />
            </Specimen>
          </div>
        </div>
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "label",
              type: "string",
              required: true,
              description: t({
                en: "Visible label text and the control's accessible name; it lands on the input via htmlFor, never on a wrapper.",
                zh: "可见的标签文本，同时也是控件的无障碍名称；它通过 htmlFor 落在 input 上，而不是外层容器。",
              }),
            },
            {
              name: "labelHidden",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Visually hide the label while keeping it in the accessibility tree.",
                zh: "在视觉上隐藏标签，同时保留在无障碍树中。",
              }),
            },
            {
              name: "description",
              type: "string",
              description: t({
                en: "Helper text under the label, wired to the input via aria-describedby.",
                zh: "标签下方的说明文字，通过 aria-describedby 关联到 input。",
              }),
            },
            {
              name: "error",
              type: "string",
              description: t({
                en: 'Error message; turns the track danger-coloured, sets aria-invalid, renders with role="alert", and joins aria-describedby.',
                zh: '错误消息；把轨道变为危险色，设置 aria-invalid，以 role="alert" 渲染，并加入 aria-describedby。',
              }),
            },
            {
              name: "readout",
              type: "ReactNode",
              description: t({
                en: "Live value display rendered opposite the label. Formatting is yours — the Slider only places it.",
                zh: "渲染在标签对面的实时数值。格式化由你负责——滑块只负责摆放。",
              }),
            },
            {
              name: "value",
              type: "number",
              description: t({
                en: "Controlled value. The types require onChange beside it, because a controlled Slider without one springs back on release.",
                zh: "受控数值。类型要求必须同时提供 onChange，否则受控滑块在松手时会弹回原处。",
              }),
            },
            {
              name: "defaultValue",
              type: "number",
              defaultValue: "min",
              description: t({
                en: "Starting value for an uncontrolled Slider. Cannot be combined with value.",
                zh: "非受控滑块的起始数值。不能与 value 同时使用。",
              }),
            },
            {
              name: "onChange",
              type: "(value: number) => void",
              description: t({
                en: "Fires with the next number on every value change, including each move of a drag.",
                zh: "每次数值变化时以新数值触发，拖动过程中的每一次移动也包含在内。",
              }),
            },
            {
              name: "onCommit",
              type: "(value: number) => void",
              description: t({
                en: "Fires once when an interaction that moved the value ends — pointer release, key release, or losing focus mid-gesture.",
                zh: "当一次改变了数值的交互结束时触发一次——松开指针、松开按键，或在手势中途失去焦点。",
              }),
            },
            {
              name: "min",
              type: "number",
              defaultValue: "0",
              description: t({
                en: "Lower bound of the range, and where an uncontrolled Slider starts.",
                zh: "范围的下界，也是非受控滑块的起点。",
              }),
            },
            {
              name: "max",
              type: "number",
              defaultValue: "100",
              description: t({
                en: "Upper bound of the range.",
                zh: "范围的上界。",
              }),
            },
            {
              name: "step",
              type: "number",
              defaultValue: "1",
              description: t({
                en: "Granularity of each step, for the pointer and for the arrow keys alike.",
                zh: "每一步的粒度，指针与方向键同样适用。",
              }),
            },
            {
              name: "size",
              type: '"sm" | "md" | "lg"',
              defaultValue: '"md"',
              description: t({
                en: "Track height and thumb diameter, both driven by controlSize.",
                zh: "轨道高度与滑块直径，二者都由 controlSize 驱动。",
              }),
            },
            {
              name: "disabled",
              type: "boolean",
              description: t({
                en: "Disables interaction; the fill and the thumb drop to the neutral colour.",
                zh: "禁用交互；填充与滑块降为中性色。",
              }),
            },
            {
              name: "id",
              type: "string",
              description: t({
                en: "Control id; auto-generated with useId when omitted.",
                zh: "控件 id；省略时通过 useId 自动生成。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX styles merged over the root wrapper — the escape hatch.",
                zh: "合并到根容器上的 StyleX 样式——逃生舱口。",
              }),
            },
            {
              name: "...native",
              type: 'Omit<ComponentProps<"input">, "type" | "size" | "min" | "max" | "step" | "value" | "defaultValue" | "onChange" | "children">',
              description: t({
                en: "Forwarded to the range input (name, disabled, ref, aria-*). onPointerUp, onPointerCancel, onKeyUp and onBlur still run — they are composed with the commit handler, not replaced by it.",
                zh: "转发给 range 输入（name、disabled、ref、aria-*）。onPointerUp、onPointerCancel、onKeyUp 与 onBlur 仍会执行——它们与提交处理逻辑组合，而不是被替换。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<ReadoutSlider />}
          doCaption={t({
            en: "Pair the track with a formatted readout whenever the exact number matters — the thumb's position alone is only an estimate.",
            zh: "只要确切数值重要，就为轨道配一个格式化的 readout——单看滑块位置只能得到一个估计。",
          })}
          dont={
            <div css={fill.inline}>
              <Slider
                label={t({ en: "Loan amount", zh: "贷款金额" })}
                min={50000}
                max={400000}
                step={5000}
                defaultValue={180000}
              />
            </div>
          }
          dontCaption={t({
            en: "Don't leave the value off-screen when precision matters — a bare track tells the visitor roughly, never exactly.",
            zh: "当精度重要时，不要让数值缺席——光秃秃的轨道只能给出大概，永远给不出确切数字。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  // Sliders read better long than wide: enough travel for a fine step, capped
  // so the track never runs the full width of the doc column.
  column: {
    display: "flex",
    flexDirection: "column",
    maxInlineSize: "32rem",
  },
  note: {
    maxInlineSize: "65ch",
  },
  // A visible cue naming the slider whose own label is hidden.
  namedGroup: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  meters: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "1fr 1fr" },
    gap: space._3,
  },
  meter: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  meterName: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  meterStat: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: space._1,
    minInlineSize: 0,
  },
  meterLabel: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  // A tally that climbs on every move must not shift the row it sits in.
  meterFigure: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontVariantNumeric: "tabular-nums",
    color: color.textMain,
  },
  keyList: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    margin: 0,
  },
  keyRow: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "minmax(9rem, auto) 1fr",
    },
    gap: { default: space._0, [breakpoints.md]: space._3 },
    alignItems: "baseline",
  },
  keyCluster: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._0,
  },
  key: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textMain,
    paddingInline: space._1,
    paddingBlock: space._00,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgInteractiveRest,
  },
  keyEffect: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
});
