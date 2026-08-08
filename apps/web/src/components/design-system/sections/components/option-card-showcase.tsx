"use client";

import { HeadsetIcon } from "@phosphor-icons/react/dist/ssr/Headset";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldIcon } from "@phosphor-icons/react/dist/ssr/Shield";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { OptionCard, OptionCardGroup } from "@tuja/ui/components/option-card";
import { Text } from "@tuja/ui/components/text";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase, StateReadout } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

type Plan = "free" | "pro" | "enterprise";
type AddOn = "support" | "seats" | "audit";
type Delivery = "standard" | "express" | "sameDay";

/** The shape `OptionCardGroup` takes, narrowed to what these demos supply. */
interface DemoOption<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

function SingleSelectDemo() {
  const [plan, setPlan] = useState<Plan>("pro");
  const options: DemoOption<Plan>[] = [
    {
      value: "free",
      label: t({ en: "Free", zh: "免费" }),
      description: t({
        en: "One project and community support.",
        zh: "一个项目，社区支持。",
      }),
    },
    {
      value: "pro",
      label: t({ en: "Pro", zh: "专业版" }),
      description: t({
        en: "Unlimited projects and daily backups.",
        zh: "项目数量不限，每日备份。",
      }),
    },
    {
      value: "enterprise",
      label: t({ en: "Enterprise", zh: "企业版" }),
      description: t({
        en: "Single sign-on, an audit log, and a named contact.",
        zh: "单点登录、审计日志，并配备专属联系人。",
      }),
    },
  ];
  return (
    <div css={[flex.col, styles.stack]}>
      <OptionCardGroup
        aria-label={t({ en: "Plan", zh: "套餐" })}
        options={options}
        value={plan}
        onChange={setPlan}
      />
      <StateReadout label={t({ en: "onChange →", zh: "onChange →" })}>
        {plan}
      </StateReadout>
    </div>
  );
}

function MultipleSelectDemo() {
  const [addOns, setAddOns] = useState<AddOn[]>(["support"]);
  const options: DemoOption<AddOn>[] = [
    {
      value: "support",
      label: t({ en: "Priority support", zh: "优先支持" }),
      description: t({
        en: "A reply within one working day.",
        zh: "一个工作日内回复。",
      }),
      icon: <HeadsetIcon weight="bold" />,
    },
    {
      value: "seats",
      label: t({ en: "Extra seats", zh: "增加席位" }),
      description: t({
        en: "Five more people on the same workspace.",
        zh: "同一工作空间再增加五人。",
      }),
      icon: <UsersThreeIcon weight="bold" />,
    },
    {
      value: "audit",
      label: t({ en: "Audit log", zh: "审计日志" }),
      description: t({
        en: "Every change, kept for two years.",
        zh: "记录每一次变更，保留两年。",
      }),
      icon: <ShieldIcon weight="bold" />,
    },
  ];
  return (
    <div css={[flex.col, styles.stack]}>
      <OptionCardGroup
        selection="multiple"
        aria-label={t({ en: "Add-ons", zh: "附加服务" })}
        options={options}
        value={addOns}
        onChange={setAddOns}
      />
      <StateReadout label={t({ en: "onChange →", zh: "onChange →" })}>
        {`[${addOns.join(", ")}]`}
      </StateReadout>
    </div>
  );
}

function TileDemo() {
  const [delivery, setDelivery] = useState<Delivery>("express");
  const options: DemoOption<Delivery>[] = [
    {
      value: "standard",
      label: t({ en: "Standard", zh: "标准" }),
      description: t({ en: "3–5 days", zh: "3–5 天" }),
      icon: <PackageIcon weight="bold" />,
    },
    {
      value: "express",
      label: t({ en: "Express", zh: "加急" }),
      description: t({ en: "Next day", zh: "次日达" }),
      icon: <LightningIcon weight="bold" />,
    },
    {
      value: "sameDay",
      label: t({ en: "Same day", zh: "当日达" }),
      description: t({ en: "Before 18:00", zh: "18:00 前送达" }),
      icon: <RocketLaunchIcon weight="bold" />,
    },
  ];
  return (
    <OptionCardGroup
      variant="tile"
      aria-label={t({ en: "Delivery", zh: "配送方式" })}
      options={options}
      value={delivery}
      onChange={setDelivery}
      css={fill.inline}
    />
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
      <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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

function KeyboardDemo() {
  const [plan, setPlan] = useState<Plan>("pro");
  const options: DemoOption<Plan>[] = [
    { value: "free", label: t({ en: "Free", zh: "免费" }) },
    { value: "pro", label: t({ en: "Pro", zh: "专业版" }) },
    { value: "enterprise", label: t({ en: "Enterprise", zh: "企业版" }) },
  ];
  return (
    <div css={[flex.col, styles.stack]}>
      <OptionCardGroup
        aria-label={t({ en: "Plan", zh: "套餐" })}
        options={options}
        value={plan}
        onChange={setPlan}
      />
      <StateReadout label={t({ en: "onChange →", zh: "onChange →" })}>
        {plan}
      </StateReadout>
    </div>
  );
}

interface SlotCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Selection mark for the current state; omit for the component's default. */
  indicator?: (selected: boolean) => ReactNode;
}

function SlotCard({ label, description, icon, indicator }: SlotCardProps) {
  const [selected, setSelected] = useState(false);
  return (
    <OptionCard
      role="checkbox"
      selected={selected}
      onClick={() => {
        setSelected(!selected);
      }}
      label={label}
      description={description}
      icon={icon}
      indicator={indicator?.(selected)}
    />
  );
}

function SlotsDemo() {
  const includedLabel = t({ en: "Included", zh: "已包含" });
  const addLabel = t({ en: "Add", zh: "添加" });
  const included = (
    <Badge variant="accent" size="small">
      {includedLabel}
    </Badge>
  );
  const add = (
    <Badge variant="neutral" size="small">
      {addLabel}
    </Badge>
  );
  return (
    <div css={[flex.col, styles.group]}>
      <SlotCard label={t({ en: "Label only", zh: "仅标签" })} />
      <SlotCard
        label={t({ en: "Label and description", zh: "标签与说明" })}
        description={t({
          en: "The description is wired up as the card's description, so it is never read as part of the name.",
          zh: "说明会被关联为该卡片的描述，因此不会被当作名称的一部分朗读。",
        })}
      />
      <SlotCard
        label={t({ en: "Icon and an indicator slot", zh: "图标与指示符插槽" })}
        description={t({
          en: "The icon is decorative and hidden from assistive tech; the badge replaces the tick.",
          zh: "图标为装饰性内容，对辅助技术隐藏；徽章取代了默认的勾选标记。",
        })}
        icon={<ShieldIcon weight="bold" />}
        indicator={(selected) => (selected ? included : add)}
      />
    </div>
  );
}

function BespokeDemo() {
  const [plan, setPlan] = useState<Plan>("pro");
  const cards: (DemoOption<Plan> & { price: string })[] = [
    {
      value: "free",
      label: t({ en: "Free", zh: "免费" }),
      description: t({ en: "One project.", zh: "一个项目。" }),
      price: t({ en: "£0 a month", zh: "每月 £0" }),
      icon: <PackageIcon weight="bold" />,
    },
    {
      value: "pro",
      label: t({ en: "Pro", zh: "专业版" }),
      description: t({ en: "Unlimited projects.", zh: "项目数量不限。" }),
      price: t({ en: "£12 a month", zh: "每月 £12" }),
      icon: <LightningIcon weight="bold" />,
    },
    {
      value: "enterprise",
      label: t({ en: "Enterprise", zh: "企业版" }),
      description: t({ en: "Single sign-on.", zh: "单点登录。" }),
      price: t({ en: "Talk to us", zh: "请联系我们" }),
      icon: <UsersThreeIcon weight="bold" />,
    },
  ];
  const { getOptionProps } = useRadioGroup({
    values: cards.map((card) => card.value),
    value: plan,
    onChange: setPlan,
  });
  return (
    <div
      role="radiogroup"
      aria-label={t({ en: "Plan", zh: "套餐" })}
      css={[flex.col, styles.group]}
    >
      {cards.map((card) => (
        <OptionCard
          key={card.value}
          {...getOptionProps(card.value)}
          selected={card.value === plan}
          icon={card.icon}
          label={card.label}
          description={card.description}
        >
          <span css={styles.price}>{card.price}</span>
        </OptionCard>
      ))}
    </div>
  );
}

function DisabledDemo() {
  const [plan, setPlan] = useState<Plan>("free");
  const options: DemoOption<Plan>[] = [
    {
      value: "free",
      label: t({ en: "Free", zh: "免费" }),
      description: t({
        en: "Available on any account.",
        zh: "任何账户均可使用。",
      }),
    },
    {
      value: "pro",
      label: t({ en: "Pro", zh: "专业版" }),
      description: t({
        en: "Available on any account.",
        zh: "任何账户均可使用。",
      }),
    },
    {
      value: "enterprise",
      label: t({ en: "Enterprise", zh: "企业版" }),
      description: t({
        en: "Needs a verified organisation.",
        zh: "需要已验证的组织。",
      }),
      disabled: true,
    },
  ];
  return (
    <OptionCardGroup
      aria-label={t({ en: "Plan", zh: "套餐" })}
      options={options}
      value={plan}
      onChange={setPlan}
      css={fill.inline}
    />
  );
}

function GuidelineCard({ withIndicator }: { withIndicator: boolean }) {
  const [selected, setSelected] = useState(true);
  const label = t({ en: "Pro", zh: "专业版" });
  const description = t({ en: "Unlimited projects.", zh: "项目数量不限。" });
  return (
    <OptionCard
      role="checkbox"
      selected={selected}
      onClick={() => {
        setSelected(!selected);
      }}
      label={label}
      description={description}
      indicator={withIndicator ? undefined : null}
    />
  );
}

export function OptionCardShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Single selection", zh: "单选" })}>
        <Specimen caption='selection="single"'>
          <SingleSelectDemo />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'selection="multiple" makes every card a checkbox with its own tab stop, and the arrow keys stay out of it — that is what the checkbox pattern asks for, since each card is an independent answer rather than one of a set.',
            zh: 'selection="multiple" 会把每张卡片变成复选框，各自占一个 Tab 停靠点，方向键不再介入——复选框模式本就如此，因为每张卡片都是独立的答案，而不是一组中的其中之一。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Row and tile", zh: "行式与平铺" })}>
        <Specimen caption='variant="tile"'>
          <TileDemo />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'variant="tile" stacks each card and moves the selection mark into the corner, and the group becomes a grid that fits as many cards per line as the space allows. Reach for it when the labels are short; a row keeps a long description readable.',
            zh: 'variant="tile" 会让每张卡片纵向堆叠，并把选中标记移到角落，整组则变为网格，一行放得下多少张就放多少张。标签简短时用它；说明较长时行式更易读。',
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
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "A disabled card stays rendered and still announces its label and description, so the visitor learns the choice exists — but it leaves the arrow-key order, so the keys can never land selection on it.",
            zh: "被禁用的卡片仍会渲染，也仍会朗读其标签与说明，让访客知道存在这个选项——但它会退出方向键的顺序，因此按键永远不会把选择落在它上面。",
          })}
        </Text>
      </Showcase>

      <Showcase label="OptionCard" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "label",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The card's primary text, and its accessible name on its own — nothing else in the card joins the name.",
                zh: "卡片的主文本，并单独构成其可访问名称——卡片内的其他内容都不会加入该名称。",
              }),
            },
            {
              name: "description",
              type: "ReactNode",
              description: t({
                en: "Supporting copy beneath the label, attached as the card's description via aria-describedby.",
                zh: "标签下方的辅助说明，通过 aria-describedby 关联为卡片的描述。",
              }),
            },
            {
              name: "icon",
              type: "ReactNode",
              description: t({
                en: "Decorative leading graphic, rendered aria-hidden. It also tints to the accent colour once the card is selected.",
                zh: "前置的装饰性图形，以 aria-hidden 渲染。卡片被选中后，它也会染上强调色。",
              }),
            },
            {
              name: "indicator",
              type: "ReactNode",
              description: t({
                en: "Replaces the selection mark, which defaults to a radio dot or a checkbox tick following role. Pass null for a card with no mark at all.",
                zh: "替换选中标记；默认标记会依据 role 呈现为单选圆点或复选勾号。传入 null 则完全不显示标记。",
              }),
            },
            {
              name: "selected",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Paints the card as chosen, and supplies aria-checked when role is set.",
                zh: "把卡片绘制为已选中状态；当设置了 role 时，同时提供 aria-checked。",
              }),
            },
            {
              name: "disabled",
              type: "boolean",
              description: t({
                en: "Renders the card unselectable: the button's own disabled semantics, a not-allowed cursor, and a dimmed, disabled-tinted surface. Inside a single-select OptionCardGroup it also leaves the arrow-key order.",
                zh: "把卡片渲染为不可选：带上 button 自身的禁用语义、not-allowed 光标，以及变暗并改用禁用底色的表面。位于单选的 OptionCardGroup 内时，它还会退出方向键的顺序。",
              }),
            },
            {
              name: "variant",
              type: '"row" | "tile"',
              defaultValue: '"row"',
              description: t({
                en: "A full-width row, or a centred tile for a grid of small cards.",
                zh: "撑满宽度的行，或用于小卡片网格的居中方块。",
              }),
            },
            {
              name: "role",
              type: '"radio" | "checkbox"',
              description: t({
                en: 'Selection semantics, and the difference a screen reader hears: a radio announces "one of N", a checkbox "on/off". Omit for a card that merely acts when pressed.',
                zh: "选择语义，也是屏幕阅读器听到的差别：单选项朗读为“N 选一”，复选框朗读为“开/关”。若卡片只是按下即执行动作，则不要设置。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              description: t({
                en: "Bespoke content under the description — the escape hatch to the custom layer. It stays out of the accessible name.",
                zh: "说明下方的自定义内容——通往自定义层的逃生舱口。它不会进入可访问名称。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX styles merged over the card, composed last so a caller wins.",
                zh: "合并到卡片上的 StyleX 样式，最后合成，使调用方可覆盖。",
              }),
            },
            {
              name: "…button attributes",
              type: 'Omit<ComponentProps<"button">, "children" | "role">',
              description: t({
                en: 'Forwarded to the rendered button; type defaults to "button", so a card inside a form never submits it. Spreading useRadioGroup\'s getOptionProps() is all a bespoke group needs.',
                zh: '转发给渲染出的 button；type 默认为 "button"，因此表单内的卡片永远不会提交表单。自定义分组只需展开 useRadioGroup 的 getOptionProps() 即可。',
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label="OptionCardGroup" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "options",
              type: "readonly { value: TValue; label: ReactNode; description?: ReactNode; icon?: ReactNode; disabled?: boolean }[]",
              required: true,
              description: t({
                en: "Ordered cards. Arrow-key navigation follows this order, and a disabled card is skipped by it.",
                zh: "有序的卡片列表。方向键导航按此顺序进行，被禁用的卡片会被跳过。",
              }),
            },
            {
              name: "selection",
              type: '"single" | "multiple"',
              defaultValue: '"single"',
              description: t({
                en: "Single renders a radiogroup with roving focus; multiple renders a plain group of independently tabbable checkboxes.",
                zh: "single 渲染为带漫游焦点的单选组；multiple 渲染为一组各自可 Tab 到达的复选框。",
              }),
            },
            {
              name: "value",
              type: "TValue | readonly TValue[]",
              required: true,
              description: t({
                en: 'The selected value, or the selected values when selection is "multiple". Controlled only — the answer is page state, so the parent owns it.',
                zh: '选中的值；当 selection 为 "multiple" 时为选中值的数组。仅支持受控——答案属于页面状态，由父组件持有。',
              }),
            },
            {
              name: "onChange",
              type: "((next: TValue) => void) | ((next: TValue[]) => void)",
              required: true,
              description: t({
                en: "Called with the next value on click or keyboard select; with the next array whenever a multi-select card is toggled.",
                zh: "点击或键盘选择时以下一个值调用；多选时每次切换卡片则以下一个数组调用。",
              }),
            },
            {
              name: "variant",
              type: '"row" | "tile"',
              defaultValue: '"row"',
              description: t({
                en: "A stack of full-width rows, or a grid of centred tiles that wraps at 9rem per card.",
                zh: "撑满宽度的行式堆叠，或每张卡片最小 9rem、自动换行的居中方块网格。",
              }),
            },
            {
              name: "aria-label",
              type: "string",
              description: t({
                en: "Names the group. Required unless aria-labelledby is given — one of the two is enforced at the type level, because the card labels name the options, never the group.",
                zh: "为该组命名。除非提供 aria-labelledby，否则必填——类型层面强制二选一，因为卡片标签只命名选项，不命名整个组。",
              }),
            },
            {
              name: "aria-labelledby",
              type: "string",
              description: t({
                en: "Id of a visible element that names the group — usually the question above it. Mutually exclusive with aria-label.",
                zh: "为该组命名的可见元素 id——通常是其上方的问题。与 aria-label 互斥。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides merged over the group, composed last so a caller wins.",
                zh: "合并到该组上的 StyleX 覆盖样式，最后合成，使调用方可覆盖。",
              }),
            },
            {
              name: "…div attributes",
              type: 'Omit<ComponentProps<"div">, "children" | "onChange" | "role" | "aria-label" | "aria-labelledby">',
              description: t({
                en: "Forwarded to the group element. The role and the naming attributes are the component's own.",
                zh: "转发给该组的容器元素。role 与命名相关的属性由组件自行掌管。",
              }),
            },
          ]}
        />
      </Showcase>

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
  // A `Specimen` lays its stage out with flex, so every demo root states its own
  // width: without it a group of short labels shrinks to the widest card.
  stack: {
    gap: space._3,
    inlineSize: "100%",
  },
  group: {
    gap: space._2,
    inlineSize: "100%",
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
  price: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.accentText,
  },
});
