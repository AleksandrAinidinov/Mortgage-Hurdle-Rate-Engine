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

  /** How many months the user is considering waiting before acting */
  waitMonths: number;
}

// ── Response ───────────────────────────────────────────────────────────

export interface AnalyzeResponse {
  /** Monthly dollar difference between current rate and offer rate */
  monthlyCostOfWaiting: number;

  /** Total dollar cost of waiting the specified number of months */
  totalCostOfWaiting: number;

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
  // ── Current Mortgage (user-provided) ────────────────────────────────
  currentRate: number;
  remainingBalance: number;
  remainingTermMonths: number;
  waitMonths: number;

  // ── Pathfinder inputs ───────────────────────────────────────────────
  city: string;
  province: string;
  homeValue: number;

  // ── Penalty Calculator inputs ───────────────────────────────────────
  lender: string;
  mortgageRateType: "Fixed" | "Variable";
  originalTermYears: number;
  maturityDate: string; // MM/DD/YYYY
  paymentFrequency: "Monthly" | "Bi-Weekly" | "Accelerated Bi-Weekly" | "Weekly";
  mortgagePayment: number;

  // ── Optional overrides ──────────────────────────────────────────────
  hasDefaultInsurance?: boolean;
  isOwnerOccupied?: boolean;
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
  };
}
