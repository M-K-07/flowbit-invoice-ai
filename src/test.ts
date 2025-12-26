// test-memory.ts
import 'dotenv/config';
import { saveHumanReview, getPastReviews, showMemory,  } from './memory.ts';
// import { HumanReview } from './src/types';

// Clear DB for clean test (optional)
import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
db.exec('DELETE FROM human_reviews');

type HumanReview = {
  invoiceId: string;
  vendor: string;
  corrections: { field: string; from: any; to: any; reason: string }[];
  finalDecision: "approved" | "rejected";
};


// Test data
const testReview1: HumanReview = {
  invoiceId: "INV-A-001",
  vendor: "Supplier GmbH",
  corrections: [
    { field: "serviceDate", from: null, to: "2024-01-01", reason: "From Leistungsdatum" }
  ],
  finalDecision: "approved"
};

const testReview2: HumanReview = {
  invoiceId: "INV-B-001",
  vendor: "Parts AG",
  corrections: [
    { field: "grossTotal", from: 2400, to: 2380, reason: "VAT included" },
    { field: "taxTotal", from: 400, to: 380, reason: "Recalculated" }
  ],
  finalDecision: "approved"
};

// Save to memory
// saveHumanReview(testReview1);
// saveHumanReview(testReview2);

// // Show results
// console.log("=== MEMORY CONTENTS AFTER SAVING ===\n");
// showMemory();

// // Verify retrieval
// console.log("\n=== RAW RETRIEVED DATA ===\n");
// console.log(getPastReviews());

console.log("\n=== TEST COMPLETED ===");
// clearMemory();
// console.log("Memory cleared")

showMemory();


// Test LLM
