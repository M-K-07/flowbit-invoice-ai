// src/memory.ts
import Database from 'better-sqlite3';
import type { HumanReview } from './types.ts';

const db = new Database('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS human_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceId TEXT UNIQUE,
    vendor TEXT,
    corrections TEXT,
    finalDecision TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function saveHumanReview(review: HumanReview) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO human_reviews 
    (invoiceId, vendor, corrections, finalDecision)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(
    review.invoiceId,
    review.vendor,
    JSON.stringify(review.corrections),
    review.finalDecision
  );
}

export function getPastReviews(): HumanReview[] {
  const rows = db.prepare('SELECT * FROM human_reviews ORDER BY timestamp').all();
  return rows.map(row => ({
    invoiceId: row.invoiceId,
    vendor: row.vendor,
    corrections: JSON.parse(row.corrections),
    finalDecision: row.finalDecision as "approved" | "rejected"
  }));
}

export function showMemory() {
  const reviews = getPastReviews();
  if (reviews.length === 0) {
    console.log("No learned memories yet.\n");
    return;
  }
  console.table(
    reviews.map(r => ({
      Invoice: r.invoiceId,
      Vendor: r.vendor,
      Corrections: r.corrections.map((c: any) => `${c.field} → ${c.to}`).join("; "),
      Decision: r.finalDecision
    }))
  );
}

// export function clearMemory() {
//   db.exec('DELETE FROM human_reviews');
// }