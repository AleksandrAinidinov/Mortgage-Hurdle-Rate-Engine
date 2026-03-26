import { Router } from "express";
import { analyzeFull } from "../controllers/strategyController";

const router = Router();

/** Perch-integrated — fetches live rates + penalty from Perch APIs */
router.post("/analyze-full", analyzeFull);

export default router;