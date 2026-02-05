import express from "express";
import { protect } from "../middlewares/auth";
import { getAuditLogs, manualOverride } from "../controllers/autditController";
 // <--- Import this

const router = express.Router();

// ... existing routes ...

// NEW: Audit History Route
router.get("/audit/:reconId", protect, getAuditLogs);
router.patch("/:id/status", protect, manualOverride);


export default router;