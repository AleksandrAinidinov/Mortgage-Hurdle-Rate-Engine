import { Router } from "express";
import { analyzeFull } from "../controllers/strategyController";

const router = Router();

/** Fetches live rates and penalty from Perch APIs */
router.post("/analyze-full", analyzeFull);

export default router;