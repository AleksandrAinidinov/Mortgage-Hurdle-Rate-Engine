export interface AnalyzeRequest {
  /** Current annual mortgage rate (e.g. 5.25 for 5.25%) */
  currentRate: number;

  /** Outstanding principal balance ($) */
  remainingBalance: number;

  /** Months left on the current mortgage term */
  remainingTermMonths: number;

  /** Best available annual rate from Pathfinder (e.g. 4.09 for 4.09%) */
  bestOfferRate: number;

  /** Term length of the best offer in years */
  offerTermYears: number;

  /** Cost of breaking the current mortgage early ($) — from Penalty Calculator */
  penaltyCost: number;

  /** Time (months) the user is considering waiting */
  waitMonths: number;

  // ── Optional Perch-Calculated Overrides ──────────────────────────────
  /** Total interest savings over the term (from Perch API) */
  totalInterestSavings?: number;
  /** Net benefit = savings - penalty (from Perch API) */
  netBenefit?: number;
}

// ── Response ───────────────────────────────────────────────────────────

export interface AnalyzeResponse {
  /** Monthly interest savings if switching today ($) */
  monthlyInterestSavings: number;

  /** Total dollar cost of waiting the specified number of months */
  totalCostOfWaiting: number;

  /** The daily cost of procrastinating on this decision ($) */
  dailyCostOfWaiting: number;

  /** Months of lower payments needed to recover the penalty cost */
  paybackPeriodMonths: number;

  /** The rate the market would need to reach for waiting to break even */
  breakEvenRate: number;

  /** Net financial benefit of switching now (savings minus penalty) */
  netBenefitNow: number;

  /** Net benefit after subtracting the cost of waiting */
  adjustedBenefit: number;

  /** The engine's timing recommendation */
  recommendation: "LOCK_NOW" | "WAIT";

  /** Human-readable explanation of the recommendation */
  summary: string;
}

// ── Full (Perch-Integrated) Request ────────────────────────────────────

export interface FullAnalyzeRequest {
  // ── Core Strategic Inputs (7 Fields for Precision) ─────────────────
  currentRate: number;
  remainingBalance: number;
  maturityDate: string; // MM/DD/YYYY
  homeValue: number;
  waitMonths: number;
  lender: string;
  mortgageRateType: "Fixed" | "Variable";
}

// ── Full (Perch-Integrated) Response ───────────────────────────────────

export interface FullAnalyzeResponse extends AnalyzeResponse {
  /** Source data from Perch Pathfinder */
  pathfinder: {
    bestOffer: {
      lender: string;
      netRate: number;
      termYears: number;
    };
    totalOffersFound: number;
  };

  /** Source data from Perch Penalty Calculator */
  penalty: {
    totalPenalty: number;
    oldInterest: number;
    newInterest: number;
    difference: number;
    totalRaw: number;
  };
}
