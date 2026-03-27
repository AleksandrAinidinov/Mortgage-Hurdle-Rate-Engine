# Mortgage Cost of Waiting Engine

A prototype application that helps homeowners decide whether to break their current mortgage now or wait for better rates. Instead of giving generic advice, it calculates exactly how much money they lose every day by waiting.

## Problem
Homeowners considering breaking or switching their mortgage are often paralyzed by market volatility. They ask, **"Is it worth waiting for a better rate?"** but have no way to quantify the actual daily cost of that delay. 

## What it does

It acts as a wrapper around Perch's public APIs to generate a "Time-to-Decision" analysis using just 7 inputs:
- **Daily Loss**: Shows the exact dollar amount lost per day by delaying a switch.
- **Break-Even Rate**: Calculates the exact rate the market needs to drop to in order to justify waiting.
- **Accurate Penalties**: Uses Perch's penalty calculator to get real IRD (Interest Rate Differential) costs instead of relying on basic estimates.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript

## Quick Start
1. Clone the repository.
2. Run `npm install` in both the `frontend` and `backend` directories.
3. Run `npm run dev` in both directories to start the servers.
4. Open `http://localhost:5173` in your browser.

## API Integration Note
This prototype hits Perch's Pathfinder and Penalty APIs directly to source live market data. The external endpoints are currently stored in `backend/src/config/constants.ts` for quick demo purposes (in a real production environment, they should be moved to `.env`).

## Problem
Homeowners considering breaking or switching their mortgage are often paralyzed by market volatility. They ask, **"Is it worth waiting for a better rate?"** but have no way to quantify the actual daily cost of that delay. 