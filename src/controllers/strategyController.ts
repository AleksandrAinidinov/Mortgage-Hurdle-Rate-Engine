import { Request, Response } from "express";
import {
  AnalyzeRequest,
  FullAnalyzeRequest,
  FullAnalyzeResponse,
} from "../models/scenarioModel";
import { analyzeStrategy } from "../services/strategyService";
import { fetchPathfinderOffers } from "../services/pathfinderService";
import { fetchPenaltyCost } from "../services/penaltyService";

// ═══════════════════════════════════════════════════════════════════════
// POST /api/v1/strategy/analyze  (placeholder inputs for bestOffer and penaltyCost)
// ═══════════════════════════════════════════════════════════════════════

export const analyze = (req: Request, res: Response): void => {
  const body = req.body as Record<string, unknown>;

  const errors = validateManualRequest(body);
  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  const input: AnalyzeRequest = {
    currentRate: Number(body["currentRate"]),
    remainingBalance: Number(body["remainingBalance"]),
    remainingTermMonths: Number(body["remainingTermMonths"]),
    bestOfferRate: Number(body["bestOfferRate"]),
    offerTermYears: Number(body["offerTermYears"]),
    penaltyCost: Number(body["penaltyCost"]),
    waitMonths: Number(body["waitMonths"]),
  };

  const result = analyzeStrategy(input);
  res.json(result);
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/v1/strategy/analyze-full  (Perch-integrated)
// ═══════════════════════════════════════════════════════════════════════

export const analyzeFull = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  // ── Validate ────────────────────────────────────────────────────────
  const errors = validateFullRequest(body);
  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  const input: FullAnalyzeRequest = {
    currentRate: Number(body["currentRate"]),
    remainingBalance: Number(body["remainingBalance"]),
    remainingTermMonths: Number(body["remainingTermMonths"]),
    waitMonths: Number(body["waitMonths"]),
    city: String(body["city"]),
    province: String(body["province"]),
    homeValue: Number(body["homeValue"]),
    lender: String(body["lender"]),
    mortgageRateType: body["mortgageRateType"] as "Fixed" | "Variable",
    originalTermYears: Number(body["originalTermYears"]),
    maturityDate: String(body["maturityDate"]),
    paymentFrequency: body["paymentFrequency"] as FullAnalyzeRequest["paymentFrequency"],
    mortgagePayment: Number(body["mortgagePayment"]),
    hasDefaultInsurance: body["hasDefaultInsurance"] === true,
    isOwnerOccupied: body["isOwnerOccupied"] !== false, // default true
  };

  let currentStep = "initializing";
  try {
    // ── 1. Fetch best rate from Pathfinder ────────────────────────────
    currentStep = "Pathfinder (mortgage options)";
    const pathfinderResult = await fetchPathfinderOffers({
      city: input.city,
      province: input.province,
      homeValue: input.homeValue,
      mortgagePrincipal: input.remainingBalance,
      currentRate: input.currentRate,
      currentLender: input.lender,
      hasDefaultInsurance: input.hasDefaultInsurance ?? false,
      isOwnerOccupied: input.isOwnerOccupied ?? true,
    });

    const { bestOffer } = pathfinderResult;

    // ── 2. Fetch penalty from Penalty Calculator ─────────────────────
    currentStep = "Penalty Calculator";
    const penaltyResult = await fetchPenaltyCost({
      lender: input.lender,
      mortgagePrincipal: input.remainingBalance,
      mortgageRate: input.currentRate,
      mortgageRateType: input.mortgageRateType,
      originalTermYears: input.originalTermYears,
      maturityDate: input.maturityDate,
      paymentFrequency: input.paymentFrequency,
      mortgagePayment: input.mortgagePayment,
      newMortgageRate: bestOffer.netRate,
      newMortgageRateType: "Fixed", // Pathfinder offers are typically fixed
    });

    // ── 3. Run the decision engine ───────────────────────────────────
    currentStep = "decision engine calculations";
    const engineInput: AnalyzeRequest = {
      currentRate: input.currentRate,
      remainingBalance: input.remainingBalance,
      remainingTermMonths: input.remainingTermMonths,
      bestOfferRate: bestOffer.netRate,
      offerTermYears: bestOffer.termYears,
      penaltyCost: penaltyResult.totalPenalty,
      waitMonths: input.waitMonths,
    };

    const analysis = analyzeStrategy(engineInput);

    // ── 4. Enrich with Perch source data ─────────────────────────────
    const fullResponse: FullAnalyzeResponse = {
      ...analysis,
      pathfinder: {
        bestOffer: {
          lender: bestOffer.lender,
          netRate: bestOffer.netRate,
          termYears: bestOffer.termYears,
        },
        totalOffersFound: pathfinderResult.offers.length,
      },
      penalty: {
        totalPenalty: penaltyResult.totalPenalty,
        oldInterest: penaltyResult.oldInterest,
        newInterest: penaltyResult.newInterest,
        difference: penaltyResult.difference,
      },
    };

    res.json(fullResponse);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    res.status(502).json({
      error: `Failed during ${currentStep}`,
      details: message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Validation Helpers
// ═══════════════════════════════════════════════════════════════════════

const MANUAL_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "currentRate", label: "Current rate" },
  { key: "remainingBalance", label: "Remaining balance" },
  { key: "remainingTermMonths", label: "Remaining term (months)" },
  { key: "bestOfferRate", label: "Best offer rate" },
  { key: "offerTermYears", label: "Offer term (years)" },
  { key: "penaltyCost", label: "Penalty cost" },
  { key: "waitMonths", label: "Wait months" },
];

function validateManualRequest(body: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const { key, label } of MANUAL_REQUIRED_FIELDS) {
    const value = body[key];
    if (value === undefined || value === null) {
      errors.push(`${label} (${key}) is required.`);
    } else if (typeof value !== "number" || isNaN(value)) {
      errors.push(`${label} (${key}) must be a valid number.`);
    }
  }

  if (errors.length === 0) {
    if (Number(body["remainingBalance"]) <= 0)
      errors.push("remainingBalance must be greater than 0.");
    if (Number(body["remainingTermMonths"]) <= 0)
      errors.push("remainingTermMonths must be greater than 0.");
    if (Number(body["offerTermYears"]) <= 0)
      errors.push("offerTermYears must be greater than 0.");
    if (Number(body["waitMonths"]) < 0)
      errors.push("waitMonths must be 0 or greater.");
  }

  return errors;
}

// ── Full request validation ────────────────────────────────────────────

const FULL_NUMERIC_FIELDS: { key: string; label: string }[] = [
  { key: "currentRate", label: "Current rate" },
  { key: "remainingBalance", label: "Remaining balance" },
  { key: "remainingTermMonths", label: "Remaining term (months)" },
  { key: "waitMonths", label: "Wait months" },
  { key: "homeValue", label: "Home value" },
  { key: "originalTermYears", label: "Original term (years)" },
  { key: "mortgagePayment", label: "Mortgage payment" },
];

const FULL_STRING_FIELDS: { key: string; label: string }[] = [
  { key: "city", label: "City" },
  { key: "province", label: "Province" },
  { key: "lender", label: "Lender" },
  { key: "maturityDate", label: "Maturity date" },
  { key: "mortgageRateType", label: "Rate type" },
  { key: "paymentFrequency", label: "Payment frequency" },
];

function validateFullRequest(body: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const { key, label } of FULL_NUMERIC_FIELDS) {
    const value = body[key];
    if (value === undefined || value === null) {
      errors.push(`${label} (${key}) is required.`);
    } else if (typeof value !== "number" || isNaN(value)) {
      errors.push(`${label} (${key}) must be a valid number.`);
    }
  }

  for (const { key, label } of FULL_STRING_FIELDS) {
    const value = body[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors.push(`${label} (${key}) is required.`);
    }
  }

  // Semantic checks
  if (errors.length === 0) {
    if (Number(body["remainingBalance"]) <= 0)
      errors.push("remainingBalance must be greater than 0.");
    if (Number(body["homeValue"]) <= 0)
      errors.push("homeValue must be greater than 0.");

    const rateType = body["mortgageRateType"];
    if (rateType !== "Fixed" && rateType !== "Variable")
      errors.push('mortgageRateType must be "Fixed" or "Variable".');

    const freq = body["paymentFrequency"];
    const validFreqs = ["Monthly", "Bi-Weekly", "Accelerated Bi-Weekly", "Weekly"];
    if (!validFreqs.includes(String(freq)))
      errors.push(`paymentFrequency must be one of: ${validFreqs.join(", ")}.`);
  }

  return errors;
}