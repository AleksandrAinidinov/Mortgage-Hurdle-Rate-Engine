import { AnalyzeRequest, AnalyzeResponse } from "../models/scenarioModels";
import { round } from "../utils/parsers";

/**
 * Main decision and calculation engine.
 *
 * Takes user's current mortgage context, the best available offer from
 * Perch Pathfinder, and the penalty cost from Perch Penalty Calculator,
 * then computes how much the user is losing daily to help them make a decision: lock in the new rate now or wait.
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

  // 1. Monthly Interest Savings
  const simpleMonthlyDiff = (remainingBalance * (currentRate - bestOfferRate)) / 100 / 12;

  // The "Term Total" Savings
  const totalSavings = perchSavings ?? simpleMonthlyDiff * (offerTermYears * 12);

  // Daily Loss
  const monthlyDiff = simpleMonthlyDiff;

  // 2. Cost of Waiting (months to simulate)
  const totalCostOfWaiting = monthlyDiff * waitMonths;
  const dailyCostOfWaiting = monthlyDiff / 30;

  // 3. The "Payback" Timeline
  // How many months to recover the penalty through monthly savings.
  const paybackPeriodMonths = monthlyDiff > 0 ? penaltyCost / monthlyDiff : Infinity;

  // 4. Delay Cost (Waiting + Penalty)
  const delayCost = totalCostOfWaiting + penaltyCost;

  // 5. Net Benefit of Switching Now
  let netBenefitNow = perchNetBenefit !== undefined
    ? perchNetBenefit
    : totalSavings - penaltyCost;

  // 5b. Defensive Math
  // If we have ZERO or Negative interest savings, we cannot have a positive net benefit.
  if (totalSavings <= 0 && netBenefitNow > 0) {
    netBenefitNow = -Math.abs(penaltyCost);
  }

  // 6. Break-Even (Hurdle) Rate
  // (Market rate must drop by this amount to offset the delay cost)
  // Formula: DelayCost / (Balance * Term) = Rate drop needed
  const breakEvenRate =
    remainingBalance > 0 && offerTermYears > 0
      ? bestOfferRate - (delayCost / (remainingBalance * offerTermYears)) * 100
      : bestOfferRate;

  // 7. Adjusted Benefit
  // If we wait, we lose the "Net Benefit Now" due to the delay cost.
  const adjustedBenefit = netBenefitNow - totalCostOfWaiting;

  // 8. Recommendation Logic
  // If switching today is profitable (netBenefitNow > 0) AND we have 
  // positive monthly savings (monthlyDiff > 0), LOCK NOW.
  // Otherwise, WAIT (either it costs money or there's no bleed to stop).
  const recommendation: "LOCK_NOW" | "WAIT" =
    netBenefitNow > 0 && monthlyDiff > 0 ? "LOCK_NOW" : "WAIT";

  // 9. Human-Readable Summary
  const safeFmt = (v: number) => {
    if (isNaN(v) || v === Infinity) return "---";

    const fmt = Math.abs(v).toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
    });
    return v < 0 ? `-${fmt}` : fmt;
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

  return {
    monthlyInterestSavings: round(monthlyDiff),
    totalCostOfWaiting: round(totalCostOfWaiting),
    dailyCostOfWaiting: round(dailyCostOfWaiting),
    paybackPeriodMonths:
      paybackPeriodMonths === Infinity ? -1 : round(paybackPeriodMonths),
    breakEvenRate: round(breakEvenRate),
    netBenefitNow: round(netBenefitNow),
    adjustedBenefit: round(adjustedBenefit),
    offerTermYears: round(offerTermYears),
    recommendation,
    summary,
  };
}
