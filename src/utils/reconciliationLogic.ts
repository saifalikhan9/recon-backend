import { Decimal } from "../generated/prisma/internal/prismaNamespace";

interface ReconResult {
    status: "MATCHED" | "PARTIAL_MATCH" | "UNMATCHED" | "DUPLICATE";
    variance: number;
    systemRecordId?: string;
  }
export const reconcileRow = (
  uploadedAmount: number,
  systemRecord: any | null 
): ReconResult => {

  if (!systemRecord) return { status: "UNMATCHED", variance: 0 };


  const uploadedDecimal = new Decimal(uploadedAmount);

  const diff = systemRecord.amount.minus(uploadedDecimal).abs(); 


  if (diff.equals(0)) {
    return { status: "MATCHED", variance: 0, systemRecordId: systemRecord.id };
  }


  const tolerance = systemRecord.amount.mul(0.02); 


  if (diff.lessThanOrEqualTo(tolerance)) {
    return { 
      status: "PARTIAL_MATCH", 
      variance: diff.toNumber(),
      systemRecordId: systemRecord.id 
    };
  }

  return { 
    status: "UNMATCHED", 
    variance: diff.toNumber(), 
    systemRecordId: systemRecord.id 
  };
};