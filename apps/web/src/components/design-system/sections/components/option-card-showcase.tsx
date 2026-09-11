import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import {
  BespokeDemo,
  DisabledDemo,
  GuidelineCard,
  KeyboardDemo,
  MultipleSelectDemo,
  SingleSelectDemo,
  SlotsDemo,
  TileDemo,
} from "./option-card-specimens.tsx";

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

/** The keyboard model spelled out above the cards that perform it. */
function KeyboardNotes() {
  const hints = [
    {
      keys: ["Tab"],
      effect: t({
        en: "Enters the group at the selected card, not at the first one — the group is one tab stop, not three.",
        zh: "进入该组时直接落在已选中的卡片上，而不是第一张——整组只占一个 Tab 停靠点，而非三个。",
      }),
    },
    {
      keys: ["↓", "→"],
      effect: t({
        en: "Moves to the next card and selects it, wrapping past the last one.",
        zh: "移动到下一张卡片并选中它，越过最后一张后回到开头。",
      }),
    },
    {
      keys: ["↑", "←"],
      effect: t({
        en: "Moves to the previous card and selects it.",
        zh: "移动到上一张卡片并选中它。",
      }),
    },
    {
      keys: ["Home", "End"],
      effect: t({
        en: "Jumps to the first or the last card.",
        zh: "跳到第一张或最后一张卡片。",
      }),
    },
  ];
  return (
    <>
      <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
        {t({
          en: "Click a card, then press the keys below. Focus follows selection, so each card announces as you land on it — the WAI-ARIA radiogroup model, exactly as a native radio behaves.",
          zh: "先点击一张卡片，然后按下方的按键。焦点跟随选择，因此每次落点都会被朗读——这就是 WAI-ARIA 单选组的模型，与原生单选按钮的行为一致。",
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
    </>
  );
}

export function OptionCardShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Single selection", zh: "单选" })}>
        <Specimen caption='selection="single"'>
          <SingleSelectDemo />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The default. The group is a WAI-ARIA radiogroup, each card a radio, and the group needs a name of its own — one of aria-label or aria-labelledby is required at the type level, so an unnamed group cannot ship.",
            zh: "这是默认形态。该组为 WAI-ARIA 单选组，每张卡片是一个单选项，并且整组必须有自己的名称——类型层面要求 aria-label 与 aria-labelledby 二选一，因此无名称的组根本无法交付。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Multiple selection", zh: "多选" })}>
        <Specimen caption='selection="multiple"'>
          <MultipleSelectDemo />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'selection="multiple" makes every card a checkbox with its own tab stop, and the arrow keys stay out of it — that is what the checkbox pattern asks for, since each card is an independent answer rather than one of a set.',
            zh: 'selection="multiple" 会把每张卡片变成复选框，各自占一个 Tab 停靠点，方向键不再介入——复选框模式本就如此，因为每张卡片都是独立的答案，而不是一组中的其中之一。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Row and tile", zh: "行式与平铺" })}>
        <Specimen caption='look="tile"'>
          <TileDemo />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'look="tile" stacks each card and moves the selection mark into the corner, and the group becomes a grid that fits as many cards per line as the space allows. Reach for it when the labels are short; a row keeps a long description readable.',
            zh: 'look="tile" 会让每张卡片纵向堆叠，并把选中标记移到角落，整组则变为网格，一行放得下多少张就放多少张。标签简短时用它；说明较长时行式更易读。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Keyboard", zh: "键盘操作" })}>
        <KeyboardNotes />
        <Specimen
          caption={t({ en: "focus follows selection", zh: "焦点跟随选择" })}
        >
          <KeyboardDemo />
        </Specimen>
      </Showcase>

      <Showcase
        label={t({
          en: "Icon, description, indicator",
          zh: "图标、说明与指示符",
        })}
      >
        <Specimen caption={t({ en: "three cards", zh: "三张卡片" })}>
          <SlotsDemo />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Only the label names the card. The description is attached with aria-describedby and the icon is hidden, so a card never announces a paragraph. The indicator is a slot: replace the tick with anything that still changes when the card is chosen.",
            zh: "只有标签为卡片命名。说明通过 aria-describedby 关联，图标则被隐藏，因此卡片不会朗读出一整段文字。指示符是一个插槽：可以用任何在卡片被选中时同样会变化的内容取代默认勾选标记。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Bespoke content", zh: "自定义内容" })}>
        <Specimen
          caption={t({ en: "price as children", zh: "价格作为 children" })}
        >
          <BespokeDemo />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "When a card needs to carry more than an options array can express, drop a layer: render OptionCard yourself, pass the extra content as children, and spread useRadioGroup's getOptionProps() to keep the same keyboard model. Children sit under the description and stay out of the accessible name.",
            zh: "当卡片需要承载 options 数组表达不了的内容时，就下沉一层：自行渲染 OptionCard，把额外内容作为 children 传入，并展开 useRadioGroup 的 getOptionProps() 以保持相同的键盘模型。children 位于说明下方，且不会进入可访问名称。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Disabled", zh: "禁用" })}>
        <Specimen caption={t({ en: "the third card", zh: "第三张卡片" })}>
          <DisabledDemo />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "A disabled card stays rendered and still announces its label and description, so the visitor learns the choice exists — but it leaves the arrow-key order, so the keys can never land selection on it.",
            zh: "被禁用的卡片仍会渲染，也仍会朗读其标签与说明，让访客知道存在这个选项——但它会退出方向键的顺序，因此按键永远不会把选择落在它上面。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="option-card" />

      <PropsTable component="option-card-group" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<GuidelineCard withIndicator />}
          doCaption={t({
            en: "Keep a selection mark. A mark that appears when the card is chosen is a second, non-colour cue, so the choice reads for a visitor who cannot see the accent (WCAG 1.4.1).",
            zh: "保留选中标记。卡片被选中时出现的标记是一个不依赖颜色的第二重线索，即使访客看不出强调色，也能读出所做的选择（WCAG 1.4.1）。",
          })}
          dont={<GuidelineCard withIndicator={false} />}
          dontCaption={t({
            en: "Don't pass indicator={null} on a selectable card — the accent border becomes the only thing saying it is chosen. Reserve it for cards that merely act when pressed.",
            zh: "不要在可选择的卡片上传入 indicator={null}——那样就只剩强调色边框在表示它被选中了。这种用法只留给按下即执行动作的卡片。",
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
