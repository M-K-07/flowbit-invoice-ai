export interface Invoice {
  invoiceId: string;
  vendor: string;
  fields: any;
  confidence: number;
  rawText: string;
}

export interface Correction {
  field: string;
  from: any;
  to: any;
  reason: string;
}

export interface HumanReview {
  invoiceId: string;
  vendor: string;
  corrections: Correction[];
  finalDecision: "approved" | "rejected";
}

export interface ProcessingResult {
  normalizedInvoice: any;
  proposedCorrections: string[];
  requiresHumanReview: boolean;
  reasoning: string;
  confidenceScore: number;
  memoryUpdates: string[];
  auditTrail: { step: string; timestamp: string; details: string }[];
}