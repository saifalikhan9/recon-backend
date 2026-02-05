import { prisma } from "../config/prisma";


interface AuditParams {
  reconId: string;
  action: string;
  source: string; // Changed to string to match schema
  userId: string; // REQUIRED because your schema says 'changedById String' (Not optional)
  oldValue?: any;
  newValue?: any;
}

export const auditService = {
  logChange: async ({ reconId, action, source, userId, oldValue, newValue }: AuditParams) => {
    try {
      await prisma.auditLog.create({
        data: {
          action: action,
          source: source,
          oldValue: oldValue ?? {}, // Handle nulls safely
          newValue: newValue ?? {},

          // 1. Connect the Reconciliation Record
          // Schema says: record ReconciliationResult @relation(...)
          record: {
            connect: { id: reconId }
          },

          // 2. Connect the User
          // Schema says: changedBy User @relation(...)
          changedBy: {
            connect: { id: userId }
          }
          
          // Note: We do NOT set 'recordId' or 'changedById' manually. 
          // Prisma sets them automatically via the 'connect' block.
        },
      });
      console.log(`✅ Audit Log created for ${reconId}`);
    } catch (error) {
      console.error("❌ FAILED TO AUDIT LOG:", error);
      // We log the error but don't throw, so the main transaction doesn't fail 
      // just because logging failed (unless strict auditing is required).
    }
  },
};