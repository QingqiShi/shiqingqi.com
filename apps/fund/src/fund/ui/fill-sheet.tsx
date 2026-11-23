"use client";

import { postJson } from "@tuja/auth-ui/fetch-json";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { DateField } from "@tuja/ui/components/date-field";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { Sheet } from "@tuja/ui/components/sheet";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { estimateFeesGbp } from "../orders/estimate-fees-gbp.ts";
import { toMajorUnits } from "../orders/to-major-units.ts";
import type { PendingOrderView } from "../views/load-desk.ts";
import { displayDate } from "./display-date.ts";

function parseNumber(text: string): number | null {
  const value = Number(text.replaceAll(",", "").trim());
  return text.trim() === "" || !Number.isFinite(value) ? null : value;
}

/** The form in which the owner says how an order filled, prefilled from the hint. */
function FillForm({
  order,
  onClose,
}: {
  order: PendingOrderView;
  onClose: () => void;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { instrument, prefill } = order;
  const [quantity, setQuantity] = useState(String(prefill.quantity));
  const [price, setPrice] = useState(String(prefill.quotePrice));
  const [filledOn, setFilledOn] = useState(prefill.filledOn);
  const [fees, setFees] = useState(prefill.feesGbp.toFixed(2));
  const [feesEdited, setFeesEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quantityValue = parseNumber(quantity);
  const priceValue = parseNumber(price);
  const feesValue = parseNumber(fees);
  const quantityValid =
    quantityValue !== null &&
    Number.isInteger(quantityValue) &&
    quantityValue > 0 &&
    quantityValue <= order.quantity;
  const priceValid = priceValue !== null && priceValue > 0;
  const feesValid = feesValue !== null && feesValue >= 0;
  const dateValid =
    filledOn !== "" && filledOn >= order.placedFor && filledOn <= order.through;

  const estimateFees = (nextQuantity: string, nextPrice: string) => {
    const q = parseNumber(nextQuantity);
    const p = parseNumber(nextPrice);
    if (feesEdited || q === null || p === null) return;
    setFees(
      estimateFeesGbp({
        instrument,
        side: order.side,
        quantity: q,
        price: toMajorUnits(p, instrument),
        gbpUsd: order.gbpUsd,
      }).toFixed(2),
    );
  };

  const unit =
    instrument.currency === "USD"
      ? { leading: "$" }
      : instrument.quoteScale === 100
        ? { trailing: "p" }
        : { leading: "£" };

  return (
    <form
      css={stack.group}
      onSubmit={(event) => {
        event.preventDefault();
        if (!quantityValid || !priceValid || !feesValid || !dateValid) return;
        setSaving(true);
        setError(null);
        postJson(`/api/orders/${order.id}/fill`, {
          quantity: quantityValue,
          price: priceValue,
          filledOn,
          feesGbp: feesValue,
        })
          .then(() => {
            onClose();
            router.refresh();
          })
          .catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : String(cause));
            setSaving(false);
          });
      }}
    >
      <TextField
        label={t({ en: "Shares that filled", zh: "成交股数" })}
        description={t({
          en: "At most {n}. A part fill ends the order: the rest lapses.",
          zh: "最多 {n} 股。部分成交后订单即结束，其余部分作废。",
        }).replace("{n}", order.quantity.toLocaleString("en-GB"))}
        inputMode="numeric"
        value={quantity}
        error={
          quantityValid
            ? undefined
            : t({
                en: "Enter a whole number of shares, up to the order's size.",
                zh: "请输入不超过订单数量的整数股数。",
              })
        }
        onChange={(event) => {
          setQuantity(event.target.value);
          estimateFees(event.target.value, price);
        }}
      />
      <TextField
        label={t({ en: "Price per share", zh: "每股成交价" })}
        description={
          instrument.quoteScale === 100
            ? t({
                en: "In pence, as the broker shows it.",
                zh: "以便士计，与券商显示的一致。",
              })
            : t({
                en: "As the broker shows it.",
                zh: "与券商显示的一致。",
              })
        }
        inputMode="decimal"
        value={price}
        {...unit}
        error={
          priceValid
            ? undefined
            : t({ en: "Enter the price.", zh: "请输入价格。" })
        }
        onChange={(event) => {
          setPrice(event.target.value);
          estimateFees(quantity, event.target.value);
        }}
      />
      <DateField
        label={t({ en: "Day it filled", zh: "成交日期" })}
        description={(order.placedFor === order.through
          ? t({ en: "Its only session: {from}.", zh: "唯一的交易日：{from}。" })
          : t({
              en: "Between {from} and {to}.",
              zh: "在 {from} 至 {to} 之间。",
            })
        )
          .replace("{from}", displayDate(order.placedFor, locale, "weekday"))
          .replace("{to}", displayDate(order.through, locale, "weekday"))}
        min={order.placedFor}
        max={order.through}
        value={filledOn}
        onValueChange={setFilledOn}
        error={
          dateValid
            ? undefined
            : t({
                en: "Pick a day the order was live.",
                zh: "请选择订单有效期内的一天。",
              })
        }
      />
      <TextField
        label={t({ en: "Fees", zh: "费用" })}
        description={t({
          en: "Estimated from stamp duty and the currency charge. Change it to what the broker charged.",
          zh: "按印花税和换汇费估算。可改成券商实际收取的金额。",
        })}
        inputMode="decimal"
        leading="£"
        value={fees}
        error={
          feesValid
            ? undefined
            : t({ en: "Enter the fees, or 0.", zh: "请输入费用，没有则填 0。" })
        }
        onChange={(event) => {
          setFees(event.target.value);
          setFeesEdited(true);
        }}
      />
      {error === null ? null : <Callout intent="destructive">{error}</Callout>}
      <FormFooter>
        <Button look="ghost" type="button" onClick={onClose}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
        <Button
          look="primary"
          type="submit"
          loading={saving}
          disabled={!quantityValid || !priceValid || !feesValid || !dateValid}
        >
          {t({ en: "Record the fill", zh: "记录成交" })}
        </Button>
      </FormFooter>
    </form>
  );
}

/** A sheet over the Desk to record how an order filled. */
export function FillSheet({
  order,
  isOpen,
  onClose,
}: {
  order: PendingOrderView;
  isOpen: boolean;
  onClose: () => void;
}) {
  const title =
    order.side === "buy"
      ? t({ en: "Bought {symbol}", zh: "买入 {symbol}" })
      : t({ en: "Sold {symbol}", zh: "卖出 {symbol}" });
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      title={title.replace("{symbol}", order.symbol)}
    >
      <FillForm order={order} onClose={onClose} />
    </Sheet>
  );
}
