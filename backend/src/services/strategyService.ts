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
    totalInterestSavings: perchSavings,
    netBenefit: perchNetBenefit,
  } = input;

  // ── 1. Monthly Interest Savings ─────────────────────────────────────
  // The "Bleed" (Instant Impact): Calculated via simple interest difference
  // for a sharper behavioral pitch.
  const simpleMonthlyDiff = (remainingBalance * (currentRate - bestOfferRate)) / 100 / 12;

  // The "Term Total": We prefer Perch's amortization-based total savings if available.
  const totalSavings = perchSavings ?? simpleMonthlyDiff * (offerTermYears * 12);

  const monthlyDiff = simpleMonthlyDiff; // Use simple math for the "Daily Loss" display

  // ── 2. Cost of Waiting (The "Bleed") ───────────────────────────────
  const totalCostOfWaiting = monthlyDiff * waitMonths;
  const dailyCostOfWaiting = monthlyDiff / 30;

  // ── 3. The "Payback" Timeline ───────────────────────────────────────
  // How many months to recover the penalty through monthly savings.
  const paybackPeriodMonths =
    monthlyDiff > 0 ? penaltyCost / monthlyDiff : Infinity;

  // ── 4. Delay Cost (Waiting + Penalty) ───────────────────────────────
  const delayCost = totalCostOfWaiting + penaltyCost;

  // ── 5. Net Benefit of Switching Now ─────────────────────────────────
  const netBenefitNow = perchNetBenefit !== undefined
    ? perchNetBenefit
    : totalSavings - penaltyCost;

  // ── 6. Break-Even (Hurdle) Rate ─────────────────────────────────────
  // (Market rate must drop by this amount to offset the delay cost)
  const breakEvenRate =
    remainingBalance > 0
      ? bestOfferRate - (delayCost / remainingBalance)
      : bestOfferRate;

  // ── 7. Adjusted Benefit ─────────────────────────────────────────────
  const adjustedBenefit = netBenefitNow - totalCostOfWaiting;

  // ── 8. Recommendation Logic ─────────────────────────────────────────
  const recommendation: "LOCK_NOW" | "WAIT" =
    adjustedBenefit > 0 ? "LOCK_NOW" : "WAIT";

  // ── 9. Human-Readable Summary ───────────────────────────────────────
  const safeFmt = (v: number) => {
    if (isNaN(v) || v === Infinity) return "---";
    return Math.abs(v).toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
    });
  };

  const paybackTxt =
    paybackPeriodMonths === Infinity
      ? "never"
      : `${round(paybackPeriodMonths)} months`;

  const profitMonth =
    paybackPeriodMonths === Infinity ? 0 : Math.ceil(paybackPeriodMonths);

  const summary =
    `TIME-TO-DECISION ANALYSIS\n\n` +
    `If you WAIT:\n` +
    `• Losing ${safeFmt(dailyCostOfWaiting)}/day (${safeFmt(monthlyDiff)}/month)\n\n` +
    `If you ACT:\n` +
    `• Break even in ${paybackTxt}\n` +
    (profitMonth > 0 ? `• Profit after month ${profitMonth}\n` : "") +
    `\nVERDICT:\n` +
    `${recommendation === "LOCK_NOW" ? "Lock now" : "Wait"} — ` +
    `delay only makes sense if rates drop below ${round(breakEvenRate)}%\n\n` +
    `⚠️ If you exit or refinance before ${paybackTxt} → you lose money`;

  // ── Return ──────────────────────────────────────────────────────────
  return {
    monthlyInterestSavings: round(monthlyDiff),
    totalCostOfWaiting: round(totalCostOfWaiting),
    dailyCostOfWaiting: round(dailyCostOfWaiting),
    paybackPeriodMonths:
      paybackPeriodMonths === Infinity ? -1 : round(paybackPeriodMonths),
    breakEvenRate: round(breakEvenRate),
    netBenefitNow: round(netBenefitNow),
    adjustedBenefit: round(adjustedBenefit),
    recommendation,
    summary,
  };
}

/** Round to two decimal places to keep monetary values clean. */
function round(value: number): number {
  if (isNaN(value) || value === Infinity) return -1;
  return Math.round(value * 100) / 100;
}
