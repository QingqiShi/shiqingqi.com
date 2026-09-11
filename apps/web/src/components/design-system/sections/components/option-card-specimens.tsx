"use client";

import { HeadsetIcon } from "@phosphor-icons/react/dist/ssr/Headset";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldIcon } from "@phosphor-icons/react/dist/ssr/Shield";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { OptionCard, OptionCardGroup } from "@tuja/ui/components/option-card";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { StateReadout } from "../../showcase.tsx";

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

export function SingleSelectDemo() {
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

export function MultipleSelectDemo() {
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

export function TileDemo() {
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
      look="tile"
      aria-label={t({ en: "Delivery", zh: "配送方式" })}
      options={options}
      value={delivery}
      onChange={setDelivery}
      css={fill.inline}
    />
  );
}

export function KeyboardDemo() {
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

export function SlotsDemo() {
  const includedLabel = t({ en: "Included", zh: "已包含" });
  const addLabel = t({ en: "Add", zh: "添加" });
  const included = (
    <Badge intent="accent" size="sm">
      {includedLabel}
    </Badge>
  );
  const add = (
    <Badge intent="neutral" size="sm">
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

export function BespokeDemo() {
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

export function DisabledDemo() {
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

export function GuidelineCard({ withIndicator }: { withIndicator: boolean }) {
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
  price: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.accentText,
  },
});
