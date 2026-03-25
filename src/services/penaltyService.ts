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
  const parseNumeric = (v: any): number => {
    if (typeof v === "number") return v;
    if (!v) return 0;
    // Extract digits and dots, stripping common symbols
    const match = String(v).replace(/,/g, "").match(/(\d+\.?\d*)/);
    return match ? Number(match[0]) : 0;
  };

  // Ensure maturity date is YYYY-MM-DD (Perch network logs showed this format)
  let maturityDate = input.maturityDate;
  if (maturityDate.includes("/")) {
    const parts = maturityDate.split("/");
    if (parts.length === 3) {
      const m = parts[0] || "01";
      const d = parts[1] || "01";
      const y = parts[2] || "2000";
      maturityDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  const payload = {
    // Existing mortgage fields (mortgage1)
    mortgage1Lender: input.lender,
    mortgage1Principal: input.mortgagePrincipal,
    mortgage1Rate: input.mortgageRate,
    mortgage1RateType: input.mortgageRateType,
    mortgage1Term: input.originalTermYears,
    mortgage1MaturityDate: maturityDate,
    mortgage1PmtFreq: FREQUENCY_MAP[input.paymentFrequency] ?? "Monthly",
    mortgage1Payment: input.mortgagePayment,

    // Dummy second mortgage
    mortgage2Principal: 0,
    mortgage2Rate: 10,

    // New mortgage fields (mortgage3)
    mortgage3Rate: input.newMortgageRate,
    mortgage3RateType: input.newMortgageRateType,
    mortgagePayment: input.mortgagePayment, // Often sent as a top-level too
  };

  const res = await fetch(PENALTY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
    totalPenalty: Math.abs(parseNumeric(data["Total_Penalty"])),
    oldInterest: parseNumeric(data["Old_Interest"]),
    newInterest: parseNumeric(data["New_Interest"]),
    difference: parseNumeric(data["Difference"]),
    totalRaw: parseNumeric(data["Total_raw"]),
  };
}
