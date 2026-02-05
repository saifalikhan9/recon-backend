import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../types/jwt";


export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<any> => {
    const { reconId } = req.params as {reconId :string}
  
    try {
   
      const logs = await prisma.auditLog.findMany({
        where: { recordId :reconId },
        include: { 
          changedBy: { select: { username: true, role: true } } 
        },
        orderBy: { timestamp: "desc" },
      });
  // console.log(logs);
  
     
      const formattedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,     
        source: log.source,       
        type: log.source === "SYSTEM" ? "SYSTEM" : "USER",
        user: log.changedBy?.username || "System", 
        time: log.timestamp,
        
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
