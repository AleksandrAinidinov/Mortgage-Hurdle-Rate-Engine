export function validatePrecisionRequest(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const required = ["currentRate", "remainingBalance", "maturityDate", "homeValue", "waitMonths", "lender", "mortgageRateType"];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`${field} is required.`);
    }
  }

  if (errors.length === 0) {
    if (typeof body.currentRate !== "number") errors.push("currentRate must be a number.");
    else if (body.currentRate < 3.0) errors.push("Rate is too low to be realistic (min 3.0%).");
    else if (body.currentRate > 20.0) errors.push("Rate is too high to be realistic (max 20.0%).");

    if (typeof body.remainingBalance !== "number") errors.push("remainingBalance must be a number.");
    else if (body.remainingBalance < 1000) errors.push("Remaining balance must be at least $1,000.");

    if (typeof body.homeValue !== "number") errors.push("homeValue must be a number.");
    else if (body.homeValue < 1000) errors.push("Home value must be at least $1,000.");

    if (typeof body.maturityDate !== "string") errors.push("maturityDate must be a string (MM/DD/YYYY).");
    if (body.mortgageRateType !== "Fixed" && body.mortgageRateType !== "Variable") {
      errors.push("mortgageRateType must be 'Fixed' or 'Variable'.");
    }
  }

  return errors;
}