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
  const payload = {
    scenario: "Renewal",
    propertyAddress: {
      city: input.city,
      province: input.province,
    },
    principal: input.mortgagePrincipal,
    homeValue: input.homeValue,
    defaultInsurance: input.hasDefaultInsurance,
    ownerOccupied: input.isOwnerOccupied,
    // Additional filters — defaults
    heloc: false,
    bonafide: false,
    portability: false,
    assumability: false,
  };

  const res = await fetch(PATHFINDER_URL, {
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
    .map((raw) => ({
      lender: String(raw["Lender"] ?? "Unknown"),
      netRate: Number(raw["Net_Rate"] ?? 0),
      termYears: Number(raw["Term_Yrs"] ?? 5),
      totalSavings: Number(raw["Total_Savings"] ?? 0),
    }))
    .sort((a, b) => a.netRate - b.netRate);

  const bestOffer = offers[0]!;

  return { offers, bestOffer };
}
