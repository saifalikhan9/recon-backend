import express from "express";
import { getResults, getStats, manualOverride } from "../controllers/reconciliationController";
import { protect, authorize } from "../middlewares/auth";
import { getAuditLogs } from "../controllers/autditController";

const router = express.Router();

router.get("/stats", protect, getStats);
router.get("/results", protect, getResults);

// 1. Audit History (Read)
router.get("/audit/:reconId", protect, getAuditLogs);

// 2. Manual Override (Write)
router.patch("/:id/status", protect,authorize("ADMIN","ANALYST"), manualOverride);

export default router;