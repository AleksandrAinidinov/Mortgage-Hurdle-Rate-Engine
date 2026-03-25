/**
 * Perch Pathfinder Service Adapter
 *
 * Calls Perch's Pathfinder API to fetch the best available mortgage
 * offers for a Switch/Renewal scenario.
 *
 * Endpoint: POST https://api.production.myperch.io/api/tool/mortgageSel/0
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface PathfinderRequest {
  city: string;
  province: string;
  homeValue: number;
  mortgagePrincipal: number;
  currentRate: number;
  currentLender: string;
  hasDefaultInsurance: boolean;
  isOwnerOccupied: boolean;
}

/** A single mortgage offer returned by Pathfinder. */
export interface PathfinderOffer {
  lender: string;
  netRate: number;
  termYears: number;
  totalSavings: number;
}

export interface PathfinderResult {
  /** All offers sorted by rate (lowest first) */
  offers: PathfinderOffer[];
  /** The single best (lowest-rate) offer */
  bestOffer: PathfinderOffer;
}

// ── API Call ────────────────────────────────────────────────────────────

const PATHFINDER_URL =
  "https://api.production.myperch.io/api/tool/mortgageSel/0";

export async function fetchPathfinderOffers(
  input: PathfinderRequest,
): Promise<PathfinderResult> {
  const provinceFull = input.province === "ON" ? "Ontario" : input.province;

  const payload = {
    propertyId: 0,
    scenario: "Renewal",
    propertyAddress: {
      addressModelText: input.city.toLowerCase(),
      unitNumber: null,
      streetNumber: null,
      streetName: null,
      city: input.city,
      province: provinceFull,
      country: "Canada",
      postalCode: null,
      fullAddress: `${input.city}, ${input.province}, Canada`,
      residenceLength: null,
      firmType: null,
    },
    propertyCity: input.city,
    propertyProvince: provinceFull,
    mtg1Principal: input.mortgagePrincipal,
    purchasePrice: input.homeValue,
    downPayment: null,
    targetEquityRemoval: 0,
    defaultInsurance: input.hasDefaultInsurance ? "Yes" : "No",
    creditScoreRange: null,
    ownerOccupied: input.isOwnerOccupied ? "Yes" : "No",
    propertyDownpaymentPercent: null,
    filterHeloc: "No",
    filterBonafide: "No",
    filterPort: "No",
    filterAssumption: "No",
    mtg1Term: 5,
    mtg1Rate: input.currentRate,
    mtg1RateType: "Fixed",
    mtg1Lender: input.currentLender,
    mtg1CustomLender: null,
  };

  const res = await fetch(PATHFINDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Pathfinder API returned ${res.status}: ${text || res.statusText}`,
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  const data = json["data"] as Record<string, unknown> | undefined;

  if (!data) {
    throw new Error("Pathfinder API returned no data.");
  }

  // The API nests offers under data["Mortgage Hierarchy"]
  const hierarchy = data["Mortgage Hierarchy"];

  if (!Array.isArray(hierarchy) || hierarchy.length === 0) {
    throw new Error(
      "Pathfinder returned no mortgage offers. Check your inputs (city, home value, principal).",
    );
  }

  // Map raw API offers to typed objects
  const offers: PathfinderOffer[] = (hierarchy as Record<string, unknown>[])
    .map((raw) => {
      const parseNumeric = (v: any): number => {
        if (typeof v === "number") return v;
        if (!v) return 0;
        // Extract the first sequence of digits and dots (e.g. "3 Years" -> "3", "$4,000" -> "4000")
        const match = String(v).replace(/,/g, "").match(/(\d+\.?\d*)/);
        return match ? Number(match[0]) : 0;
      };

      const rate = parseNumeric(raw["Net_Rate"]);
      const term = parseNumeric(raw["Term_Yrs"]);
      const savings = parseNumeric(raw["Total_Savings"]);

      return {
        lender: String(raw["Lender"] ?? "Unknown"),
        netRate: isNaN(rate) ? 0 : rate,
        termYears: !term || isNaN(term) ? 5 : term, // Default to 5 years if missing
        totalSavings: isNaN(savings) ? 0 : savings,
      };
    })
    .sort((a, b) => a.netRate - b.netRate);

  const bestOffer = offers[0]!;

  return { offers, bestOffer };
}
