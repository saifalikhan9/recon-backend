import { prisma } from "../config/prisma";
import { AuditParams } from "../types/audit";



export const auditService = {
  logChange: async ({ reconId, action, source, userId, oldValue, newValue }: AuditParams) => {
    try {
      await prisma.auditLog.create({
        data: {
          action: action,
          source: source,
          oldValue: oldValue ?? {}, 
          newValue: newValue ?? {},
          record: {
            connect: { id: reconId }
          },

          changedBy: {
            connect: { id: userId }
          }
          
        },
      });
      console.log(`✅ Audit Log created for ${reconId}`);
    } catch (error) {
      console.error("❌ FAILED TO AUDIT LOG:", error);
 
    }
  },
};