import {  Response } from "express";
import { prisma } from "../config/prisma";

import { auditService } from "../service/audit-service";
import { AuthRequest } from "../types/jwt";

// 1. GET DASHBOARD STATS (For the Cards & Charts)
// GET /api/reconciliation/stats?jobId=...
export const getStats = async (req: AuthRequest, res: Response): Promise<any> => {
  const { jobId } = req.query;

  try {
    const whereCondition = jobId ? { uploadJobId: String(jobId) } : {};

   
    const [total, matched, partial, unmatched, duplicate] = await Promise.all([
      prisma.reconciliationResult.count({ where: whereCondition }),
      prisma.reconciliationResult.count({ where: { ...whereCondition, status: "MATCHED" } }),
      prisma.reconciliationResult.count({ where: { ...whereCondition, status: "PARTIAL_MATCH" } }),
      prisma.reconciliationResult.count({ where: { ...whereCondition, status: "UNMATCHED" } }),
      prisma.reconciliationResult.count({ where: { ...whereCondition, status: "DUPLICATE" } }),
    ]);

    res.json({
      total,
      breakdown: { matched, partial, unmatched, duplicate },
      accuracy: total > 0 ? ((matched / total) * 100).toFixed(1) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
};

// 2. GET RESULTS (For the Data Table)
// GET /api/reconciliation/results?page=1&limit=10&status=UNMATCHED
export const getResults = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, status, search, jobId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (jobId) where.uploadJobId = String(jobId);
  if (status) where.status = String(status);
  

  if (search) {
    where.uploadedTxId = { contains: String(search) }; 
  }

  try {
    const results = await prisma.reconciliationResult.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { variance: 'desc' }, 
      include: { systemRecord: true } 
    });

    const total = await prisma.reconciliationResult.count({ where });

    res.json({ results, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: "Error fetching results" });
  }
};

// 3. MANUAL CORRECTION (With Audit Log)
// PATCH /api/reconciliation/:id
export const manualOverride = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params as { id: string };
  const { status, note  } = req.body;
  
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized: User ID missing" });
  const role = req.user?.role 
  if (!role) return res.status(401).json({ message: "Unauthorized: User Role missing" });

  try {

    const currentRecord = await prisma.reconciliationResult.findUnique({ where: { id } });
    if (!currentRecord) return res.status(404).json({ message: "Record not found" });


    const updatedRecord = await prisma.reconciliationResult.update({
      where: { id },
      data: { 
        status: status,
        adminNotes: note, 
        isManuallyCorrected: true
      }
    });


    await auditService.logChange({
      reconId: id,
      action: "MANUAL_STATUS_CHANGE",
      source: role,
      userId: userId,
      oldValue: { status: currentRecord.status },
      newValue: { status: updatedRecord.status, note },
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating record" });
  }
};