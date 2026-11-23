import type { ReportLanguage } from "../agents/prompts.ts";
import { formatPrice } from "../orders/format-price.ts";
import type { Instrument, Order } from "../types.ts";
import { sayIn } from "./memos.ts";

type Priced = Pick<Instrument, "currency" | "quoteScale">;

/** The one-line summaries of journal entries, in the report language. */
export function journalText(language: ReportLanguage) {
  const say = sayIn(language);
  const side = (s: Order["side"]) =>
    s === "buy" ? say("Buy", "买入") : say("Sell", "卖出");
  return {
    order: (
      o: Pick<
        Order,
        "side" | "symbol" | "quantity" | "limitPrice" | "validUntil"
      >,
      instrument: Priced,
      weightAfterPct: number,
    ) =>
      say(
        `${side(o.side)} ${String(o.quantity)} ${o.symbol} at a limit of ${formatPrice(o.limitPrice, instrument)} until ${o.validUntil}, to ${weightAfterPct.toFixed(1)}% of the fund`,
        `${side(o.side)} ${o.symbol} ${String(o.quantity)} 股，限价 ${formatPrice(o.limitPrice, instrument)}，有效至 ${o.validUntil}，成交后占基金 ${weightAfterPct.toFixed(1)}%`,
      ),
    hold: (symbol: string) => say(`Hold ${symbol}`, `持有 ${symbol}`),
    holdUnrecorded: (symbol: string) =>
      say(
        `Hold ${symbol}: the meeting recorded no decision for it`,
        `持有 ${symbol}：会议没有给出决定`,
      ),
    unrecordedRationale: say(
      "The PM's final decision had no action for this holding, so code recorded a hold. Nothing changed.",
      "PM 的最终决定没有提到这只持仓，代码记为持有，没有变化。",
    ),
    cancel: (
      o: Pick<Order, "side" | "symbol" | "limitPrice">,
      instrument: Priced,
    ) =>
      say(
        `Cancel the order to ${o.side} ${o.symbol} at ${formatPrice(o.limitPrice, instrument)}`,
        `撤销 ${o.symbol} 的${o.side === "buy" ? "买入" : "卖出"}委托（限价 ${formatPrice(o.limitPrice, instrument)}）`,
      ),
    rejected: (action: string, symbol: string, why: string) =>
      say(
        `Rejected: ${action} ${symbol} (${why})`,
        `被否决：${action} ${symbol}（${why}）`,
      ),
    breach: say("a hard rule", "违反硬性规则"),
    veto: say("risk veto", "风险官否决"),
    noAction: say("No trade today", "今日不交易"),
    filled: (
      o: Pick<Order, "side" | "symbol">,
      quantity: number,
      price: number,
      instrument: Priced,
      date: string,
    ) =>
      say(
        `${o.side === "buy" ? "Bought" : "Sold"} ${String(quantity)} ${o.symbol} at ${formatPrice(price, instrument)} on ${date}`,
        `成交：${o.side === "buy" ? "买入" : "卖出"} ${o.symbol} ${String(quantity)} 股，价格 ${formatPrice(price, instrument)}（${date}）`,
      ),
    notFilled: (
      o: Pick<Order, "side" | "symbol" | "limitPrice">,
      instrument: Priced,
      through: string,
    ) =>
      say(
        `Not filled through ${through}: ${o.side} ${o.symbol} at ${formatPrice(o.limitPrice, instrument)}`,
        `截至 ${through} 未成交：${o.side === "buy" ? "买入" : "卖出"} ${o.symbol}，限价 ${formatPrice(o.limitPrice, instrument)}`,
      ),
    expired: (
      o: Pick<Order, "side" | "symbol" | "limitPrice" | "validUntil">,
      instrument: Priced,
    ) =>
      say(
        `Expired unfilled on ${o.validUntil}: ${o.side} ${o.symbol} at ${formatPrice(o.limitPrice, instrument)}`,
        `到期未成交（${o.validUntil}）：${o.side === "buy" ? "买入" : "卖出"} ${o.symbol}，限价 ${formatPrice(o.limitPrice, instrument)}`,
      ),
    unfilledPlan: say("The plan for an unfilled order", "未成交时的计划"),
    fundThesis: (version: number) =>
      version === 1
        ? say("Fund thesis v1 written", "写下基金投资逻辑第 1 版")
        : say(
            `Fund thesis revised to v${String(version)}`,
            `基金投资逻辑修订为第 ${String(version)} 版`,
          ),
    riskPolicy: (version: number) =>
      version === 1
        ? say("Risk policy v1 written", "写下风险政策第 1 版")
        : say(
            `Risk policy revised to v${String(version)}`,
            `风险政策修订为第 ${String(version)} 版`,
          ),
  };
}
