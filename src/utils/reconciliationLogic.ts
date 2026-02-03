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

  // 1. Turn the uploaded number into a Decimal so we compare "Apples to Apples"
  const uploadedDecimal = new Decimal(uploadedAmount); // <--- USED HERE

  // 2. Do Math using the library methods (Not +, -, *)
  // systemRecord.amount is ALREADY a Decimal
  const diff = systemRecord.amount.minus(uploadedDecimal).abs(); // <--- USED HERE

  // 3. Exact Match Check
  if (diff.equals(0)) { // <--- USED HERE
    return { status: "MATCHED", variance: 0, systemRecordId: systemRecord.id };
  }

  // 4. Tolerance Check (2%)
  // mul = multiply
  const tolerance = systemRecord.amount.mul(0.02); 

  // lessThanOrEqualTo is safer than <=
  if (diff.lessThanOrEqualTo(tolerance)) {
    return { 
      status: "PARTIAL_MATCH", 
      variance: diff.toNumber(), // Convert back to number only for the result object
      systemRecordId: systemRecord.id 
    };
  }

  return { 
    status: "UNMATCHED", 
    variance: diff.toNumber(), 
    systemRecordId: systemRecord.id 
  };
};