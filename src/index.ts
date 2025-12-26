// src/index.ts
import type { Invoice, ProcessingResult } from './types.ts';
import { getPastReviews } from './memory.ts';
import { getAISuggestions } from './agent.ts';

export async function processInvoice(
  invoice: Invoice,
  pos: any[],
  dns: any[]
): Promise<ProcessingResult> {
  const auditTrail: ProcessingResult['auditTrail'] = [];
  const proposedCorrections: string[] = [];
  let reasoning = "";
  let confidenceScore = invoice.confidence;
  let requiresHumanReview = true;

  const normalized = { ...invoice, fields: { ...invoice.fields } };

  auditTrail.push({
    step: "recall",
    timestamp: new Date().toISOString(),
    details: "Loaded past human reviews for learned memory"
  });

  const pastReviews = getPastReviews();

  // KEY FIX: Check if we have memory SPECIFIC to this vendor
  console.log(`Past reviews for vendor ${invoice.vendor}:`, pastReviews);

  const pastReviewsForThisVendor = pastReviews.filter(r => r.vendor === invoice.vendor);
  const hasMemoryForThisVendor = pastReviewsForThisVendor.length > 0;

  const { suggestions = [], reasoning: aiReasoning = "" } = await getAISuggestions(
    invoice,
    pastReviews,
    pos,
    dns
  );


  // Optional: Log for debugging (remove later if you want)
  console.log("AI Suggestions:", suggestions);

  reasoning += aiReasoning || "AI analysis completed.";

  let applied = 0;
  suggestions.forEach(s => {
    // Average AI confidence with extraction confidence
    confidenceScore = (confidenceScore + s.confidence) / 2;

    proposedCorrections.push(
      `${s.field} → ${JSON.stringify(s.value)} (conf: ${s.confidence.toFixed(2)}, ${s.reason})`
    );

    // Auto-apply only high-confidence suggestions
    if (s.confidence >= 0.8) {
      applied++;
      if (s.field.includes('.')) {
        const [parent, child] = s.field.split('.');
        if (normalized.fields[parent]) {
          normalized.fields[parent][child] = s.value;
        }
      } else {
        normalized.fields[s.field] = s.value;
      }

      auditTrail.push({
        step: "apply",
        timestamp: new Date().toISOString(),
        details: `Auto-applied ${s.field} = ${JSON.stringify(s.value)} (conf ${s.confidence.toFixed(2)})`
      });
    }
  });

  // FINAL DECISION LOGIC — THIS IS THE CRUCIAL PART
  if (hasMemoryForThisVendor && confidenceScore >= 0.80 && applied >= suggestions.length * 0.7) {
    requiresHumanReview = false;
    reasoning += " | Learned pattern from past human corrections for this vendor + high confidence → auto-approved.";
  } else {
    requiresHumanReview = true;
    if (!hasMemoryForThisVendor) {
      reasoning += " | First time processing invoice from this vendor → requires human review to establish reliable learned pattern.";
    } else {
      reasoning += " | Confidence not sufficient yet → requires human verification.";
    }
  }

  auditTrail.push({
    step: "decide",
    timestamp: new Date().toISOString(),
    details: `Vendor memory exists: ${hasMemoryForThisVendor} | Final confidence: ${confidenceScore.toFixed(2)} | Human review: ${requiresHumanReview}`
  });

  return {
    normalizedInvoice: normalized,
    proposedCorrections,
    requiresHumanReview,
    reasoning: reasoning.trim(),
    confidenceScore: Number(confidenceScore.toFixed(2)),
    memoryUpdates: [], // Filled in demo when saving
    auditTrail
  };
}