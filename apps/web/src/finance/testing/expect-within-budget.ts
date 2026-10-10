import { expect } from "vitest";

/**
 * Wall-clock budgets are flaky on a loaded machine, so they are opt-in:
 * run `FINANCE_PERF=1 pnpm --filter web test src/finance` to enforce them.
 */
export function expectWithinBudget(elapsedMs: number, budgetMs: number) {
  if (process.env.FINANCE_PERF === "1") {
    expect(elapsedMs).toBeLessThan(budgetMs);
  }
}
