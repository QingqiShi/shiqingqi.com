"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Slider } from "@tuja/ui/components/slider";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";

/** A money readout — the figure a budget slider exists to name. */
export function BudgetSlider() {
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
export function BoundedSliders() {
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
export function ChangeVersusCommit() {
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
export function FieldContractSliders() {
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
        <Text as="span" look="bodySmall" weight="semibold">
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
export function KeyboardSlider() {
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
export function ReadoutSlider() {
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
export function DisabledSlider() {
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

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
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
    color: color.textMuted,
  },
  // A tally that climbs on every move must not shift the row it sits in.
  meterFigure: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontVariantNumeric: "tabular-nums",
    color: color.textMain,
  },
});
