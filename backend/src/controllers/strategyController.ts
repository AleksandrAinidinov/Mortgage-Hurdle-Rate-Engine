import { Request, Response, NextFunction } from "express";
import { validatePrecisionRequest } from "../utils/validation";
import { calculateMonthsRemaining, estimatePayment } from "../utils/parsers";
import {
  FullAnalyzeRequest,
  AnalyzeRequest,
} from "../models/scenarioModels";
import { analyzeStrategy } from "../services/strategyService";
import { fetchPathfinderOffers } from "../services/pathfinderService";
import { fetchPenaltyCost } from "../services/penaltyService";

/**
 * POST /api/v1/strategy/analyze-full
 *
 * The "Smarter Wrapper": Takes 6 strategic fields and uses internal
 * "Smart Defaults" to satisfy Perch's APIs and reduce the number of inputs needed from the user
 * for demo purposes.
 */
export const analyzeFull = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  // Core Fields Validation
  const errors = validatePrecisionRequest(body);
  if (errors.length > 0) {
    const error = new Error("Validation failed") as any;
    error.statusCode = 400;
    error.details = errors;
    next(error);
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
    // Calculate internal metrics
    const remainingTermMonths = calculateMonthsRemaining(input.maturityDate);
    const estimatedPmt = estimatePayment(input.remainingBalance, input.currentRate);

    // Fetch best rate from Pathfinder
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

    // Fetch penalty from Perch
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

    // Run the Decision Engine
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

    // 3. Analysis combined with Pathfinder and Penalty data
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
    const error = new Error(`Failed during ${currentStep}: ${err instanceof Error ? err.message : "Unknown error"}`) as any;
    error.statusCode = 502;
    next(error);
  }
};