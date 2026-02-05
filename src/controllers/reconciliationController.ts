import {  Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth";
import { auditService } from "../service/audit-service";

// 1. GET DASHBOARD STATS (For the Cards & Charts)
// GET /api/reconciliation/stats?jobId=...
export const getStats = async (req: AuthRequest, res: Response): Promise<any> => {
  const { jobId } = req.query;

  try {
    const whereCondition = jobId ? { uploadJobId: String(jobId) } : {};

    // Run count queries in parallel for speed
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
  
  // Search by Transaction ID
  if (search) {
    where.uploadedTxId = { contains: String(search) }; // 'mode: insensitive' is default in some Postgres setups
  }

  try {
    const results = await prisma.reconciliationResult.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { variance: 'desc' }, // Show biggest problems first
      include: { systemRecord: true } // Return the System Record details too
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
  
  // Safety check for User ID
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized: User ID missing" });
  const role = req.user?.role 
  if (!role) return res.status(401).json({ message: "Unauthorized: User Role missing" });

  try {
    // 1. Fetch Current State (Old Value)
    const currentRecord = await prisma.reconciliationResult.findUnique({ where: { id } });
    if (!currentRecord) return res.status(404).json({ message: "Record not found" });

    // 2. Perform the Update
    const updatedRecord = await prisma.reconciliationResult.update({
      where: { id },
      data: { 
        status: status,
        adminNotes: note, // Ensure this field exists in your schema
        isManuallyCorrected: true
      }
    });

    // 3. Log via Service (Keeps controller clean)
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