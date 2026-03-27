export function calculateMonthsRemaining(maturityDateStr: string): number {
  const maturity = new Date(maturityDateStr);
  const now = new Date();
  if (isNaN(maturity.getTime())) return 0;

  const diffYears = maturity.getFullYear() - now.getFullYear();
  const diffMonths = diffYears * 12 + (maturity.getMonth() - now.getMonth());
  return Math.max(0, diffMonths);
}

export function estimatePayment(principal: number, rate: number): number {
  const r = rate / 100 / 12;
  const n = 25 * 12; // Standard 25yr Amortization
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function parseNumeric(v: any): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  // Extract digits and dots, preserving optional leading minus sign
  const match = String(v).replace(/,/g, "").match(/(-?\d+\.?\d*)/);
  return match ? Number(match[0]) : 0;
}

// Normalize lender names to match Perch's expected format
export function normalizeLender(name: string): string {
  const l = name.toLowerCase();
  if (l.includes("td")) return "TD";
  if (l.includes("rbc") || l.includes("royal bank")) return "RBC";
  if (l.includes("bmo") || l.includes("montreal")) return "BMO";
  if (l.includes("scotia")) return "Scotiabank";
  if (l.includes("cibc")) return "CIBC";
  if (l.includes("hsbc")) return "HSBC";
  if (l.includes("tangerine")) return "Tangerine";
  return name;
}

// Round to two decimal places to keep values as Numbers
export function round(value: number): number {
  if (isNaN(value) || value === Infinity) return -1;
  return Math.round(value * 100) / 100;
}