import {  Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth";

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
  const { id }  = req.params as {id:string};
  const { status, notes } = req.body;
  const userId = req.user?.id; // From Auth Middleware

  try {
    // A. Start a Transaction (Atomicity)
    // If saving the Audit Log fails, the Update MUST fail too.
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Get current data for "Old Value"
      const currentRecord = await tx.reconciliationResult.findUnique({ where: { id }  });
      if (!currentRecord) throw new Error("Record not found");

      // 2. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: "MANUAL_OVERRIDE",
          recordId: id,
          changedById: userId,
          oldValue: { status: currentRecord.status }, // Saving JSON
          newValue: { status: status, notes },

        }
      });

      // 3. Update the Record
      const updatedRecord = await tx.reconciliationResult.update({
        where: { id },
        data: {
          status: status,
          adminNotes: notes,
          isManuallyCorrected: true
        }
      });

      return updatedRecord;
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: "Update failed", error });
  }
};