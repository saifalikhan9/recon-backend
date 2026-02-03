"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./src/config/prisma");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🌱 Starting seeding...");
        // 1. Clear existing data (Optional: Keeps DB clean for testing)
        yield prisma_1.prisma.reconciliationResult.deleteMany();
        yield prisma_1.prisma.uploadJob.deleteMany();
        yield prisma_1.prisma.systemRecord.deleteMany();
        console.log("🧹 Cleared old data.");
        const records = [];
        // 2. Generate 100 Records Loop
        for (let i = 1; i <= 100; i++) {
            // Pad ID with zeros (TX_001, TX_002... TX_100)
            const idSuffix = String(i).padStart(3, '0');
            // Random amount between 100 and 5000
            const randomAmount = (Math.random() * 4900 + 100).toFixed(2);
            records.push({
                transactionId: `TX_${idSuffix}`,
                amount: Number(randomAmount), // Stored as Decimal in DB
                referenceNumber: `REF_${idSuffix}_X`,
                date: new Date('2025-01-01'), // All set to Jan 1st for simplicity
                details: `Payment for Order #${idSuffix}`
            });
        }
        // 3. Insert specific "Known" records for easy manual testing
        // These override the random ones so you KNOW exactly what to expect.
        records[0] = { transactionId: "TX_TEST_EXACT", amount: 1000.00, referenceNumber: "REF_001", date: new Date(), details: "Exact Match Test" };
        records[1] = { transactionId: "TX_TEST_PARTIAL", amount: 500.00, referenceNumber: "REF_002", date: new Date(), details: "Partial Match Test" };
        records[2] = { transactionId: "TX_TEST_FAIL", amount: 200.00, referenceNumber: "REF_003", date: new Date(), details: "Fail Match Test" };
        // 4. Bulk Insert
        yield prisma_1.prisma.systemRecord.createMany({
            data: records,
        });
        console.log(`✅ Successfully seeded ${records.length} system records.`);
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.$disconnect();
}));
