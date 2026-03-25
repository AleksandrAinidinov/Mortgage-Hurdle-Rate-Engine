import { AnalyzeRequest, AnalyzeResponse } from "../models/scenarioModel";

/**
 * Core decision engine.
 *
 * Takes a user's current mortgage context, the best available offer from
 * Perch Pathfinder, and the penalty cost from Perch Penalty Calculator,
 * then computes whether the user should lock in the new rate now or wait.
 *
 * All calculations use simplified interest (no amortization schedules).
 */
export function analyzeStrategy(input: AnalyzeRequest): AnalyzeResponse {
  const {
    currentRate,
    remainingBalance,
    bestOfferRate,
    offerTermYears,
    penaltyCost,
    waitMonths,
  } = input;

  // ── 1. Monthly Cost Difference ──────────────────────────────────────
  // How much more the user pays per month staying at the current rate
  // vs. switching to the best offer rate.
  const monthlyDiff =
    ((currentRate - bestOfferRate) / 100) * remainingBalance / 12;

  // ── 2. Cost of Waiting ──────────────────────────────────────────────
  // Total extra interest the user pays by waiting `waitMonths` before acting.
  const totalCostOfWaiting = monthlyDiff * waitMonths;

  // ── 3. Delay Cost (Waiting + Penalty) ───────────────────────────────
  // Full cost of inaction: opportunity cost of waiting PLUS the penalty
  // to break the current mortgage.
  const delayCost = totalCostOfWaiting + penaltyCost;

  // ── 4. Estimated Savings From Switching ─────────────────────────────
  // Total savings over the entire new offer term if the user switches now.
  const totalSavings = monthlyDiff * (offerTermYears * 12);

  // ── 5. Net Benefit of Switching Now ─────────────────────────────────
  // Total savings minus the penalty cost of breaking the current mortgage.
  const netBenefitNow = totalSavings - penaltyCost;

  // ── 6. Break-Even (Hurdle) Rate ─────────────────────────────────────
  // The rate the market would need to reach for waiting to make financial
  // sense. If the market rate drops below this, waiting would have been
  // worth it; otherwise, the user should act now.
  const breakEvenRate = bestOfferRate - (delayCost / remainingBalance);

  // ── 7. Adjusted Benefit ─────────────────────────────────────────────
  // After accounting for the cost of waiting, is switching still worth it?
  const adjustedBenefit = netBenefitNow - totalCostOfWaiting;

  // ── 8. Recommendation Logic ─────────────────────────────────────────
  // Pure money-based decision — no arbitrary rate thresholds.
  const recommendation: "LOCK_NOW" | "WAIT" =
    adjustedBenefit > 0 ? "LOCK_NOW" : "WAIT";

  // ── 9. Human-Readable Summary ───────────────────────────────────────
  const fmt = (v: number) =>
    Math.abs(v).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
  const action = recommendation === "LOCK_NOW" ? "LOCK NOW" : "WAIT";

  const summary =
    `You are ${monthlyDiff >= 0 ? "overpaying" : "saving"} ~${fmt(monthlyDiff)}/month ` +
    `at your current rate. ` +
    `Switching now saves ${fmt(netBenefitNow)} over the new term, ` +
    `but waiting ${waitMonths} months costs ${fmt(totalCostOfWaiting)}. ` +
    `Adjusted benefit: ${fmt(adjustedBenefit)}. ` +
    `Recommendation: ${action}.`;

  // ── Return ──────────────────────────────────────────────────────────
  return {
    monthlyCostOfWaiting: round(monthlyDiff),
    totalCostOfWaiting: round(totalCostOfWaiting),
    breakEvenRate: round(breakEvenRate),
    netBenefitNow: round(netBenefitNow),
    adjustedBenefit: round(adjustedBenefit),
    recommendation,
    summary,
  };
}

/** Round to two decimal places to keep monetary values clean. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
