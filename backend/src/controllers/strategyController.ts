import { Request, Response } from "express";
import {
  FullAnalyzeRequest,
  FullAnalyzeResponse,
  AnalyzeRequest,
} from "../models/scenarioModel";
import { analyzeStrategy } from "../services/strategyService";
import { fetchPathfinderOffers } from "../services/pathfinderService";
import { fetchPenaltyCost } from "../services/penaltyService";

/**
 * POST /api/v1/strategy/analyze-full
 *
 * The "Smarter Wrapper": Takes 6 strategic fields and uses internal
 * "Smart Defaults" to satisfy Perch's data-hungry APIs.
 */
export const analyzeFull = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  // 1. Precision Validation (7 Core Fields)
  const errors = validatePrecisionRequest(body);
  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  const input: FullAnalyzeRequest = {
    currentRate: Number(body.currentRate),
    remainingBalance: Number(body.remainingBalance),
    maturityDate: String(body.maturityDate),
    homeValue: Number(body.homeValue),
    waitMonths: Number(body.waitMonths),
    lender: String(body.lender),
    mortgageRateType: body.mortgageRateType as "Fixed" | "Variable",
  };

  let currentStep = "initializing";
  try {
    // 2. Derive Internal Metrics
    const remainingTermMonths = calculateMonthsRemaining(input.maturityDate);
    const estimatedPmt = estimatePayment(input.remainingBalance, input.currentRate);

    // ── Step A: Fetch best rate from Pathfinder ───────────────────────
    currentStep = "Pathfinder API (Rates)";
    const pathfinderResult = await fetchPathfinderOffers({
      city: "Toronto",
      province: "ON",
      homeValue: input.homeValue,
      mortgagePrincipal: input.remainingBalance,
      currentRate: input.currentRate,
      currentLender: input.lender,
      hasDefaultInsurance: false,
      isOwnerOccupied: true,
    });

    const { bestOffer } = pathfinderResult;

    // ── Step B: Fetch penalty from Perch ──────────────────────────────
    currentStep = "Penalty API (Costs)";
    const penaltyResult = await fetchPenaltyCost({
      lender: input.lender,
      mortgagePrincipal: input.remainingBalance,
      mortgageRate: input.currentRate,
      mortgageRateType: input.mortgageRateType,
      originalTermYears: 5,        // DEFAULTS
      maturityDate: input.maturityDate,
      paymentFrequency: "Monthly", // DEFAULTS
      mortgagePayment: estimatedPmt,
      newMortgageRate: bestOffer.netRate,
      newMortgageRateType: "Fixed",
    });

    // ── Step C: Run the Decision Engine (Hybrid Math) ─────────────────
    currentStep = "Decision Engine";
    const engineInput: AnalyzeRequest = {
      currentRate: input.currentRate,
      remainingBalance: input.remainingBalance,
      remainingTermMonths: remainingTermMonths,
      bestOfferRate: bestOffer.netRate,
      offerTermYears: bestOffer.termYears,
      penaltyCost: penaltyResult.totalPenalty,
      waitMonths: input.waitMonths,
      totalInterestSavings: penaltyResult.difference,
      netBenefit: penaltyResult.totalRaw,
    };

    const analysis = analyzeStrategy(engineInput);

    // 3. Perfected Narrative Response
    // const fullResponse: FullAnalyzeResponse = {
    //   ...analysis,
    // pathfinder: {
    //   bestOffer: {
    //     lender: bestOffer.lender,
    //     netRate: bestOffer.netRate,
    //     termYears: bestOffer.termYears,
    //   },
    //   totalOffersFound: pathfinderResult.offers.length,
    // },
    // penalty: {
    //   totalPenalty: penaltyResult.totalPenalty,
    //   oldInterest: penaltyResult.oldInterest,
    //   newInterest: penaltyResult.newInterest,
    //   difference: penaltyResult.difference,
    //   totalRaw: penaltyResult.totalRaw,
    // },
    //};

    res.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Failed during ${currentStep}`, details: message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Precision Utilities
// ═══════════════════════════════════════════════════════════════════════

function calculateMonthsRemaining(maturityDateStr: string): number {
  const maturity = new Date(maturityDateStr);
  const now = new Date();
  if (isNaN(maturity.getTime())) return 0;

  const diffYears = maturity.getFullYear() - now.getFullYear();
  const diffMonths = diffYears * 12 + (maturity.getMonth() - now.getMonth());
  return Math.max(0, diffMonths);
}

function estimatePayment(principal: number, rate: number): number {
  const r = rate / 100 / 12;
  const n = 25 * 12; // Standard 25yr Amortization
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function validatePrecisionRequest(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const required = ["currentRate", "remainingBalance", "maturityDate", "homeValue", "waitMonths", "lender", "mortgageRateType"];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`${field} is required.`);
    }
  }

  if (errors.length === 0) {
    if (typeof body.currentRate !== "number") errors.push("currentRate must be a number.");
    if (typeof body.remainingBalance !== "number") errors.push("remainingBalance must be a number.");
    if (typeof body.homeValue !== "number") errors.push("homeValue must be a number.");
    if (typeof body.maturityDate !== "string") errors.push("maturityDate must be a string (MM/DD/YYYY).");
    if (body.mortgageRateType !== "Fixed" && body.mortgageRateType !== "Variable") {
      errors.push("mortgageRateType must be 'Fixed' or 'Variable'.");
    }
  }

  return errors;
}
