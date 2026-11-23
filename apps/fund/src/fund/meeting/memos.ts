import type { ReportLanguage } from "../agents/prompts.ts";
import type {
  AnalystAnswer,
  AnalystNote,
} from "../contracts/analyst-note-schema.ts";
import type { FundThesis } from "../contracts/fund-thesis-schema.ts";
import type { MacroBrief } from "../contracts/macro-brief-schema.ts";
import type {
  PmAction,
  PmDecision,
  ThesisReview,
} from "../contracts/pm-decision-schema.ts";
import type { RiskPolicy } from "../contracts/risk-policy-schema.ts";
import type {
  PolicyReview,
  RiskReview,
  RiskSignoff,
} from "../contracts/risk-review-schema.ts";
import { formatPrice } from "../orders/format-price.ts";
import type { OrderPlan } from "../orders/types.ts";
import type { Instrument } from "../types.ts";

type Say = (en: string, zh: string) => string;

export function sayIn(language: ReportLanguage): Say {
  return (en, zh) => (language === "zh" ? zh : en);
}

const list = (items: readonly string[]) =>
  items.map((i) => `- ${i}`).join("\n");

function section(title: string, body: string | null | undefined): string {
  return body && body.trim() !== "" ? `**${title}**\n\n${body}` : "";
}

function join(...parts: string[]): string {
  return parts.filter((p) => p !== "").join("\n\n");
}

const STANCE: Record<AnalystNote["stance"], [string, string]> = {
  strong_buy: ["Strong buy", "强烈买入"],
  buy: ["Buy", "买入"],
  hold: ["Hold", "持有"],
  reduce: ["Reduce", "减持"],
  sell: ["Sell", "卖出"],
};

const ACTION: Record<PmAction["action"], [string, string]> = {
  buy: ["Buy", "买入"],
  sell: ["Sell", "卖出"],
  hold: ["Hold", "持有"],
  cancel_order: ["Cancel order", "撤单"],
};

function macro(
  say: Say,
  brief: MacroBrief,
  dropped: readonly string[],
): string {
  return join(
    brief.summary,
    section(say("Regime", "市场状态"), brief.regime),
    section(
      say("Themes", "主题"),
      list(
        brief.themes.map(
          (t) =>
            `${t.title}${t.symbols.length > 0 ? ` (${t.symbols.join(", ")})` : ""}: ${t.detail}`,
        ),
      ),
    ),
    section(say("Risks", "风险"), list(brief.risks)),
    section(
      say("Calendar", "日程"),
      list(brief.calendar.map((c) => `${c.date}: ${c.event}`)),
    ),
    section(
      say("Nominations", "提名"),
      list(brief.nominations.map((n) => `${n.symbol}: ${n.reason}`)),
    ),
    dropped.length > 0
      ? say(
          `Dropped nominations outside the universe: ${dropped.join(", ")}.`,
          `已删除不在股票池中的提名：${dropped.join("、")}。`,
        )
      : "",
    section(
      say("Sources", "来源"),
      list(brief.sources.map((s) => `[${s.title}](${s.url})`)),
    ),
  );
}

function analyst(say: Say, note: AnalystNote, instrument: Instrument): string {
  const [en, zh] = STANCE[note.stance];
  const entry =
    note.entryLow !== null && note.entryHigh !== null
      ? say(
          `Entry range: ${String(note.entryLow)}–${String(note.entryHigh)} (${instrument.quoteScale === 100 ? "p" : instrument.currency})`,
          `买入区间：${String(note.entryLow)}–${String(note.entryHigh)}（${instrument.quoteScale === 100 ? "便士" : instrument.currency}）`,
        )
      : "";
  return join(
    `**${note.symbol}** · ${say(en, zh)} · ${say("conviction", "信心")} ${String(note.conviction)}/5`,
    note.summary,
    section(say("Bull case", "看多理由"), list(note.bull)),
    section(say("Bear case", "看空理由"), list(note.bear)),
    section(say("Earnings", "盈利"), note.earnings),
    section(say("Valuation", "估值"), note.valuation),
    section(
      say("News", "新闻"),
      list(note.news.map((n) => `${n.date} ${n.headline}: ${n.takeaway}`)),
    ),
    section(say("Catalysts", "催化剂"), list(note.catalysts)),
    note.thesisCheck === "not_held"
      ? ""
      : section(
          say("Thesis check", "逻辑检验"),
          `${note.thesisCheck}: ${note.thesisCheckReason}`,
        ),
    entry,
    section(say("Risk flags", "风险提示"), list(note.riskFlags)),
    section(
      say("Sources", "来源"),
      list(note.sources.map((s) => `[${s.title}](${s.url})`)),
    ),
  );
}

function actionLine(say: Say, a: PmAction): string {
  const [en, zh] = ACTION[a.action];
  const terms =
    a.action === "buy" || a.action === "sell"
      ? ` → ${String(a.targetWeightPct ?? "?")}% @ ${String(a.limitPrice ?? "?")}, ${String(a.validSessions ?? "?")} ${say("sessions", "个交易日")}, ${a.onExpiry ?? "?"}${a.repriceLimit !== null ? ` ≤ ${String(a.repriceLimit)}` : ""}`
      : "";
  return `**${say(en, zh)} ${a.symbol}**${terms}. ${a.rationale}`;
}

function verdictTitle(
  say: Say,
  what: [string, string],
  verdict: "keep" | "revise",
  hasEarlier: boolean,
): string {
  const [en, zh] = what;
  if (verdict === "keep") return say(`${en}: unchanged`, `${zh}：不变`);
  return hasEarlier
    ? say(`${en}: revised`, `${zh}：修订`)
    : say(`${en}: first version`, `${zh}：第一版`);
}

function thesisReview(
  say: Say,
  review: ThesisReview,
  hasEarlier: boolean,
): string {
  return join(
    section(
      verdictTitle(
        say,
        ["Fund thesis", "基金投资逻辑"],
        review.verdict,
        hasEarlier,
      ),
      review.evidence,
    ),
    review.verdict === "revise" && review.revised
      ? fundThesis(say, review.revised, review.changeNote)
      : "",
  );
}

function policyReview(
  say: Say,
  review: PolicyReview,
  hasEarlier: boolean,
): string {
  return join(
    section(
      verdictTitle(
        say,
        ["Risk policy", "风险政策"],
        review.verdict,
        hasEarlier,
      ),
      review.evidence,
    ),
    review.verdict === "revise" && review.revised
      ? riskPolicy(say, review.revised, review.changeNote)
      : "",
  );
}

function pmDecision(
  say: Say,
  d: PmDecision,
  { hasThesis }: { hasThesis: boolean },
): string {
  return join(
    thesisReview(say, d.thesisReview, hasThesis),
    section(say("Market view", "市场观点"), d.marketView),
    section(say("Plan check", "计划检查"), d.planCheck),
    section(
      say("Actions", "决定"),
      list(d.actions.map((a) => actionLine(say, a))),
    ),
    section(say("Why no trade", "为何不交易"), d.noActionReason),
    section(
      say("Questions to analysts", "向分析师提问"),
      list(d.questions.map((q) => `${q.symbol}: ${q.question}`)),
    ),
    section(say("Reply to risk", "回应风险官"), d.replyToRisk),
  );
}

function checks(
  say: Say,
  plan: Pick<OrderPlan, "planned" | "violations" | "adjustments">,
  instrumentFor: (symbol: string) => Instrument | undefined,
  extra: readonly string[] = [],
): string {
  const orderLines = plan.planned.map((o) => {
    const instrument = instrumentFor(o.symbol);
    const price = instrument
      ? formatPrice(o.limitPrice, instrument)
      : String(o.limitPrice);
    return `${o.side === "buy" ? say("Buy", "买入") : say("Sell", "卖出")} ${String(o.quantity)} ${o.symbol} @ ${price} (≈ £${o.estimatedValueGbp.toFixed(2)}, ${say("until", "有效至")} ${o.validUntil})`;
  });
  return join(
    section(
      say("Orders", "委托"),
      orderLines.length > 0 ? list(orderLines) : say("None.", "无。"),
    ),
    section(
      say("Breaches of hard rules", "违反硬性规则"),
      list(plan.violations.map((v) => `${v.symbol} (${v.code}): ${v.message}`)),
    ),
    section(
      say("Adjustments by code", "代码调整"),
      list(plan.adjustments.map((a) => `${a.symbol}: ${a.message}`)),
    ),
    ...extra,
  );
}

function riskReview(
  say: Say,
  review: RiskReview,
  { hasPolicy, clamped }: { hasPolicy: boolean; clamped: readonly string[] },
): string {
  return join(
    policyReview(say, review.policyReview, hasPolicy),
    clamped.length > 0
      ? say(
          `Code clamped ${clamped.join(", ")} to the owner's guardrails.`,
          `代码已将 ${clamped.join("、")} 限制在所有者的硬性规则内。`,
        )
      : "",
    section(say("Review of the draft", "对草案的审查"), review.overall),
    section(
      say("Verdicts", "裁定"),
      list(
        review.verdicts.map(
          (v) =>
            `${v.symbol}: ${v.verdict}${v.maxWeightPct !== null ? ` ≤ ${String(v.maxWeightPct)}%` : ""}. ${v.reason}`,
        ),
      ),
    ),
    section(
      say("Risk factors", "风险因子"),
      list(review.factorNotes.map((f) => `${f.factor}: ${f.note}`)),
    ),
    section(say("Concerns", "关注点"), list(review.portfolioConcerns)),
    section(say("Required changes", "要求修改"), list(review.requiredChanges)),
  );
}

function answer(say: Say, question: string, reply: AnalystAnswer): string {
  return join(
    section(say("Question", "问题"), question),
    section(say("Answer", "回答"), reply.answer),
  );
}

function signoff(say: Say, s: RiskSignoff): string {
  return join(
    s.statement,
    section(
      say("Verdicts", "裁定"),
      list(s.verdicts.map((v) => `${v.symbol}: ${v.verdict}. ${v.reason}`)),
    ),
  );
}

function fundThesis(
  say: Say,
  t: FundThesis,
  changeNote: string | null,
): string {
  const c = t.portfolioConstruction;
  return join(
    t.summary,
    section(say("What changed", "修改说明"), changeNote),
    section(say("Objective", "目标"), t.objective),
    section(say("Edge", "优势"), t.edge),
    section(
      say("Construction", "组合构建"),
      `${String(c.minPositions)}–${String(c.maxPositions)} ${say("positions", "个持仓")}, ${say("typical", "典型权重")} ${String(c.typicalWeightPct)}%. ${c.cashPolicy}`,
    ),
    section(
      say("Plan", "计划"),
      list(t.plan.map((p) => `${p.phase}: ${p.description}`)),
    ),
    section(
      say("Screen weights", "筛选权重"),
      Object.entries(t.screenWeights)
        .map(([k, v]) => `${k} ${String(v)}`)
        .join(", "),
    ),
    section(say("Holding discipline", "持有纪律"), t.holdingDiscipline),
    section(say("Sell discipline", "卖出纪律"), t.sellDiscipline),
  );
}

function riskPolicy(
  say: Say,
  p: RiskPolicy,
  changeNote: string | null,
): string {
  const l = p.limits;
  return join(
    p.statement,
    section(say("What changed", "修改说明"), changeNote),
    section(
      say("Risk budget", "风险预算"),
      list(
        p.factors.map(
          (f) =>
            `${f.name} (${f.stance}${f.metric ? `, ${f.metric} ${String(f.targetMin ?? "–")}…${String(f.targetMax ?? "–")}` : ""}): ${f.rationale}`,
        ),
      ),
    ),
    section(
      say("Limits", "限额"),
      list([
        `${say("Max position", "单一持仓上限")} ${String(l.maxPositionWeightPct)}%`,
        `${say("Max sector", "单一行业上限")} ${String(l.maxSectorWeightPct)}%`,
        `${say("Min cash", "最低现金")} ${String(l.minCashWeightPct)}%`,
        `${say("Max USD", "美元资产上限")} ${String(l.maxUsdWeightPct)}%`,
        `${say("Max positions", "最多持仓数")} ${String(l.maxPositions)}`,
      ]),
    ),
  );
}

/** The markdown of each step for the minutes, in the report language. */
export const memos = {
  macro,
  analyst,
  pmDecision,
  checks,
  riskReview,
  answer,
  signoff,
  fundThesis,
  riskPolicy,
};
