import express from "express";
import { getStats, getResults, manualOverride } from "../controllers/reconciliationController";
import { protect, authorize } from "../middlewares/auth";

const router = express.Router();

router.get("/stats", protect, getStats);
router.get("/results", protect, getResults);

// Only Admins or Analysts can fix data
router.patch("/:id", protect, authorize("ADMIN", "ANALYST"), manualOverride);

export default router;