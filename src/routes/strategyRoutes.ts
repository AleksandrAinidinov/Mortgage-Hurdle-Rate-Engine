import { Router } from "express";
import { analyze, analyzeFull } from "../controllers/strategyController";

const router = Router();

/** Manual inputs — caller provides all values directly */
router.post("/analyze", analyze);

/** Perch-integrated — fetches live rates + penalty from Perch APIs */
router.post("/analyze-full", analyzeFull);

export default router;