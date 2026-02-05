import { Request, Response } from "express";
import fs from "fs";
import csv from "csv-parser";
import { prisma } from "../config/prisma";
import { reconcileRow } from "../utils/reconciliationLogic";
import { AuthRequest } from "../types/jwt";



export const uploadFile = async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    console.log(`[UPLOAD] Received file: ${req.file.originalname} (${req.file.path})`);

    const job = await prisma.uploadJob.create({
      data: {
        filename: req.file.originalname,
        status: "PROCESSING",
        userId: req?.user?.id, 
      },
    });

    res.status(202).json({ message: "File accepted. Processing started.", jobId: job.id });

    
    processFileInBackground(req.file.path, job.id);

  } catch (error) {
    console.error("[UPLOAD] Error in controller:", error);
    res.status(500).json({ message: "Upload failed", error });
  }
};



const processFileInBackground = async (filePath: string, jobId: string) => {
  console.log(`[JOB ${jobId}] Starting background processing...`);
  
  const BATCH_SIZE = 500;
  let batchRows: any[] = [];
  let processedCount = 0;
  let rowCounter = 0; 
  
  const seenInFile = new Set<string>();

  try {

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const stream = fs.createReadStream(filePath).pipe(csv());

    for await (const row of stream) {
      rowCounter++;


      if (rowCounter === 1) {
        console.log(`[JOB ${jobId}] FIRST ROW RAW DATA:`, row);
        console.log(`[JOB ${jobId}] DETECTED HEADERS:`, Object.keys(row));
      }


      const txId = row['transactionID'] || row['Transaction ID'] || row['transactionId'] || row['id'];
      const amt = row['amount'] || row['Amount'] || row['AMOUNT'];
      const date = row['date'] || row['Date'];

      const cleanRow = {
        transactionId: txId?.trim(),
        amount: parseFloat(amt),
        date: date
      };

      if (!cleanRow.transactionId) {
        if (rowCounter <= 5) console.warn(`[JOB ${jobId}] Skipping Row ${rowCounter}: Missing Transaction ID. (Value: ${txId})`);
        continue; 
      }
      
      if (isNaN(cleanRow.amount)) {
        if (rowCounter <= 5) console.warn(`[JOB ${jobId}] Skipping Row ${rowCounter}: Invalid Amount. (Value: ${amt})`);
        continue;
      }

 
      batchRows.push(cleanRow);


      if (batchRows.length >= BATCH_SIZE) {
        console.log(`[JOB ${jobId}] Processing batch of ${batchRows.length} rows...`);
        await processBatch(batchRows, jobId, seenInFile);
        processedCount += batchRows.length;
        
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { processedRecords: processedCount }
        });

        batchRows = [];
      }
    }


    if (batchRows.length > 0) {
      console.log(`[JOB ${jobId}] Processing final batch of ${batchRows.length} rows...`);
      await processBatch(batchRows, jobId, seenInFile);
      processedCount += batchRows.length;
    }

    console.log(`[JOB ${jobId}] COMPLETED. Total rows: ${rowCounter}, Processed: ${processedCount}`);


    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { 
        status: "COMPLETED", 
        processedRecords: processedCount, 
        totalRecords: processedCount 
      }
    });

  } catch (error) {
    console.error(`[JOB ${jobId}] CRITICAL FAILURE:`, error);
    

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { 
        status: "FAILED", 
        errors: { message: error instanceof Error ? error.message : "Unknown error" } 
      }
    });
  } finally {
 
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[JOB ${jobId}] Cleaned up temp file.`);
    }
  }
};


const processBatch = async (rows: any[], jobId: string, seenInFile: Set<string>) => {
  try {
    const transactionIds = rows.map(r => r.transactionId);


    // console.log(`[BATCH] Lookup ${transactionIds.length} IDs in DB...`);

    const systemRecords = await prisma.systemRecord.findMany({
      where: { transactionId: { in: transactionIds } }
    });

    const systemMap = new Map(systemRecords.map(rec => [rec.transactionId, rec]));
    const resultsToSave: any[] = [];

    for (const row of rows) {
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

      const systemRecord = systemMap.get(row.transactionId);
      const result = reconcileRow(row.amount, systemRecord || null);

      resultsToSave.push({
        uploadJobId: jobId,
        uploadedTxId: row.transactionId,
        uploadedAmount: row.amount,
        status: result.status,
        variance: result.variance,
 
        systemRecordId: systemRecord?.id || null 
      });
    }

    if (resultsToSave.length > 0) {
      await prisma.reconciliationResult.createMany({
        data: resultsToSave
      });
      // console.log(`[BATCH] Saved ${resultsToSave.length} results.`);
    }
  } catch (err) {
    console.error(`[BATCH ERROR] Failed to process batch:`, err);
    throw err;
  }
};