/**
 * Perch Penalty Calculator Service Adapter
 *
 * Calls Perch's Penalty Calculator API to compute the cost of
 * breaking an existing mortgage.
 *
 * Endpoint: POST https://api.production.myperch.io/api/tool/websiteMortgagePayCalc
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface PenaltyRequest {
  // Existing mortgage
  lender: string;
  mortgagePrincipal: number;
  mortgageRate: number;
  mortgageRateType: "Fixed" | "Variable";
  originalTermYears: number;
  maturityDate: string; // MM/DD/YYYY format
  paymentFrequency: "Monthly" | "Bi-Weekly" | "Accelerated Bi-Weekly" | "Weekly";
  mortgagePayment: number;

  // New mortgage (from Pathfinder best offer)
  newMortgageRate: number;
  newMortgageRateType: "Fixed" | "Variable";
}

export interface PenaltyResult {
  /** The estimated penalty for breaking the current mortgage ($) */
  totalPenalty: number;
  /** Interest remaining on old mortgage */
  oldInterest: number;
  /** Interest on the new mortgage */
  newInterest: number;
  /** Savings difference */
  difference: number;
  /** Net result (savings minus penalty) */
  totalRaw: number;
}

// ── Frequency Mapping ──────────────────────────────────────────────────

const FREQUENCY_MAP: Record<string, string> = {
  Monthly: "Monthly",
  "Bi-Weekly": "Bi-Weekly",
  "Accelerated Bi-Weekly": "Accelerated Bi-Weekly",
  Weekly: "Weekly",
};

// ── API Call ────────────────────────────────────────────────────────────

const PENALTY_URL =
  "https://api.production.myperch.io/api/tool/websiteMortgagePayCalc";

export async function fetchPenaltyCost(
  input: PenaltyRequest,
): Promise<PenaltyResult> {
  const payload = {
    // Existing mortgage fields (mortgage1)
    mortgage1Lender: input.lender,
    mortgage1Principal: input.mortgagePrincipal,
    mortgage1Rate: input.mortgageRate,
    mortgage1RateType: input.mortgageRateType,
    mortgage1Term: input.originalTermYears,
    mortgage1MaturityDate: input.maturityDate,
    mortgage1Frequency: FREQUENCY_MAP[input.paymentFrequency] ?? "Monthly",
    mortgage1Payment: input.mortgagePayment,

    // New mortgage fields (mortgage3)
    mortgage3Rate: input.newMortgageRate,
    mortgage3RateType: input.newMortgageRateType,
  };

  const res = await fetch(PENALTY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Penalty Calculator API returned ${res.status}: ${text || res.statusText}`,
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  const data = json["data"] as Record<string, unknown> | undefined;

  if (!data) {
    throw new Error("Penalty Calculator API returned no data.");
  }

  return {
    totalPenalty: Math.abs(Number(data["Total_Penalty"] ?? 0)),
    oldInterest: Number(data["Old_Interest"] ?? 0),
    newInterest: Number(data["New_Interest"] ?? 0),
    difference: Number(data["Difference"] ?? 0),
    totalRaw: Number(data["Total_raw"] ?? 0),
  };
}
