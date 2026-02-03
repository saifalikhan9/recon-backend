import { Request, Response } from "express";
import fs from "fs";
import csv from "csv-parser";
import { prisma } from "../config/prisma";
import { reconcileRow } from "../utils/reconciliationLogic";
import { AuthRequest } from "../middlewares/auth";

// 1. The Controller to Accept the File
export const uploadFile = async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    // A. Create the Job Entry immediately so UI shows "Processing"
    const job = await prisma.uploadJob.create({
      data: {
        filename: req.file.originalname,
        status: "PROCESSING",
        userId: req?.user?.id, // Assumes auth middleware attached user
      },
    });

    // B. Send Response immediately (Don't make the user wait!)
    res.status(202).json({ message: "File accepted. Processing started.", jobId: job.id });

    // C. Trigger the Heavy Processing (Fire and Forget)
    processFileInBackground(req.file.path, job.id);

  } catch (error) {
    res.status(500).json({ message: "Upload failed", error });
  }
};


// 2. The Background Processor (The "Chunking" Magic)

const processFileInBackground = async (filePath: string, jobId: string) => {
  const BATCH_SIZE = 500;
  let batchRows: any[] = []; // Temporary buffer for CSV rows
  let processedCount = 0;

  // Track duplicates within the file itself (Set stores unique IDs)
  const seenInFile = new Set<string>();

  const stream = fs.createReadStream(filePath).pipe(csv());

  for await (const row of stream) {
    // 1. Sanitize keys (remove spaces/bom)
    // Sometimes CSV headers have hidden characters. This cleans them.
    const cleanRow = {
      transactionId: row['Transaction ID']?.trim(),
      amount: parseFloat(row['Amount']),
      // Add other fields if needed
    };

    if (!cleanRow.transactionId) continue; // Skip empty rows

    // 2. Add to Batch
    batchRows.push(cleanRow);

    // 3. If Batch is full, process it
    if (batchRows.length >= BATCH_SIZE) {
      await processBatch(batchRows, jobId, seenInFile);
      processedCount += batchRows.length;
      
      // Update Job Progress (Optional: Doing this every batch keeps UI alive)
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { processedRecords: processedCount }
      });

      batchRows = []; // Clear buffer
    }
  }

  // 4. Process remaining rows (Leftovers)
  if (batchRows.length > 0) {
    await processBatch(batchRows, jobId, seenInFile);
    processedCount += batchRows.length;
  }

  // 5. Mark Job Complete
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: { 
      status: "COMPLETED", 
      processedRecords: processedCount, 
      totalRecords: processedCount 
    }
  });

  // 6. Delete Temp File
  fs.unlinkSync(filePath);
};

// --- HELPER FUNCTION: The "Batch Logic" ---
const processBatch = async (rows: any[], jobId: string, seenInFile: Set<string>) => {
  // A. Extract all IDs from this batch
  const transactionIds = rows.map(r => r.transactionId);

  // B. Fetch ALL matching System Records in ONE query
  const systemRecords = await prisma.systemRecord.findMany({
    where: { transactionId: { in: transactionIds } }
  });

  // C. Create a "Lookup Map" for instant access
  // Instead of looping through the array every time, we make a Hash Map.
  // Map Key: TransactionID -> Value: Record Object
  const systemMap = new Map(systemRecords.map(rec => [rec.transactionId, rec]));

  const resultsToSave: any[] = [];

  // D. Run Logic on the Batch
  for (const row of rows) {
    // Check for "File Duplicate" (Did we see this ID earlier in the file?)
    if (seenInFile.has(row.transactionId)) {
      resultsToSave.push({
        uploadJobId: jobId,
        uploadedTxId: row.transactionId,
        uploadedAmount: row.amount,
        status: "DUPLICATE",
        variance: 0
      });
      continue;
    }
    seenInFile.add(row.transactionId);

    // Look up System Record from our Map (Instant O(1) speed)
    const systemRecord = systemMap.get(row.transactionId);

    // Run the Math Logic
    const result = reconcileRow(row.amount, systemRecord || null);

    resultsToSave.push({
      uploadJobId: jobId,
      uploadedTxId: row.transactionId,
      uploadedAmount: row.amount,
      status: result.status,
      variance: result.variance,
      systemRecordId: result.systemRecordId
    });
  }

  // E. Bulk Insert Results
  if (resultsToSave.length > 0) {
    await prisma.reconciliationResult.createMany({
      data: resultsToSave
    });
  }
};