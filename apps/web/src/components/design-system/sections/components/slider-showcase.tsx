import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Slider } from "@tuja/ui/components/slider";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import {
  BoundedSliders,
  BudgetSlider,
  ChangeVersusCommit,
  DisabledSlider,
  FieldContractSliders,
  KeyboardSlider,
  ReadoutSlider,
} from "./slider-specimens.tsx";

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
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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

      <Showcase label="onChange / onCommit" labelLook="code">
        <div css={styles.stack}>
          <Text
            look="bodySmall"
            weight="semibold"
            wrap="pretty"
            css={styles.note}
          >
            {t({
              en: "Drive expensive recomputation from onCommit, not from onChange.",
              zh: "把开销大的重算交给 onCommit，而不是 onChange。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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

      <PropsTable component="slider" />

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
