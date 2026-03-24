import { Router } from "express";
import { analyzeStrategy } from "../controllers/strategyController";

const router = Router();

router.post("/analyze", analyzeStrategy);

export default router;