import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth";
import { auditService } from "../service/audit-service";


export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<any> => {
    const { reconId } = req.params as {reconId :string}
  
    try {
      // 1. Fetch Logs from DB (Sorted by newest first)
      const logs = await prisma.auditLog.findMany({
        where: { recordId :reconId },
        include: { 
          changedBy: { select: { username: true, role: true } } // Get user details
        },
        orderBy: { timestamp: "desc" },
      });
  console.log(logs);
  
      // 2. Format for Frontend
      const formattedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,       // e.g. "MANUAL_OVERRIDE"
        source: log.source,       // e.g. "USER" or "SYSTEM"
        type: log.source === "SYSTEM" ? "SYSTEM" : "USER",
        user: log.changedBy?.username || "System", 
        time: log.timestamp,
        
        // Pass the raw JSON diffs to frontend
        oldValue: log.oldValue, 
        newValue: log.newValue
      }));
  console.log(formattedLogs);
  
      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  };
