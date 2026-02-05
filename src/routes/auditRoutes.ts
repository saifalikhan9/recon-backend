import express from "express";
import { protect } from "../middlewares/auth";
import { getAuditLogs } from "../controllers/autditController";
 // <--- Import this

const router = express.Router();


// NEW: Audit History Route
router.get("/audit/:reconId", protect, getAuditLogs);



export default router;