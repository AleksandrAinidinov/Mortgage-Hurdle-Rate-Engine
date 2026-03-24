# Mortgage "Hurdle Rate" Engine (Prototype)

## Problem
Users can compare mortgage rates today, but can’t answer:
**Is it worth waiting for a better rate?**

This leads to decision paralysis in a changing rate environment.

---

## Solution
A simple engine that calculates:
- **Cost of waiting** (extra interest paid)
- **Hurdle rate** (future rate needed to break even)
- **Recommendation** (`LOCK NOW`, `WAIT`, `UNCERTAIN`)

---

## Example

Input:
```json
{
  "balance": 650000,
  "currentRate": 5.0,
  "proposedRate": 3.9,
  "waitMonths": 3,
  "termYears": 3
}
```

Output:
```json
{
  "costOfWaiting": 4875,
  "monthlyLoss": 1625,
  "hurdleRate": 3.55,
  "recommendation": "LOCK NOW"
}
```

## API
POST /api/v1/strategy/analyze

## Stack
Node.js, TypeScript, Express, PostgreSQL
