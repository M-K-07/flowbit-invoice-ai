// src/agent.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import type { Invoice, HumanReview } from './types.ts';

interface AISuggestion {
  field: string;
  value: any;
  reason: string;
  confidence: number;
}

interface AIResponse {
  suggestions: AISuggestion[];
  reasoning: string;
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Fast, cheap, great for JSON
  generationConfig: {
    responseMimeType: "application/json", // Forces valid JSON output
    temperature: 0.3,
  },
});

export async function getAISuggestions(
  invoice: Invoice,
  pastReviews: HumanReview[],
  pos: any[],
  dns: any[]
): Promise<AIResponse> {
  const examples = pastReviews
    .slice(-10)
    .map(
      (r) =>
        `Invoice ${r.invoiceId} (${r.vendor}): Corrections → ${JSON.stringify(r.corrections)}`
    )
    .join("\n") || "No past corrections — be very cautious, confidence ≤ 0.75";

  const prompt = `
You are a cautious, vendor-aware invoice correction agent.

CORE RULES:
- If a field EXACTLY matches a past human-approved correction for this vendor → high confidence (≥0.9)
- If new pattern or first time for vendor → low confidence (≤0.75) → requires human review
- Never invent values. Use only rawText and reference data.
- Learning is per-vendor.

PAST HUMAN CORRECTIONS (vendor-specific):
${examples}

CURRENT INVOICE:
Vendor: ${invoice.vendor}
Invoice ID: ${invoice.invoiceId}

Raw text:
"""${invoice.rawText}"""

Extracted fields:
${JSON.stringify(invoice.fields, null, 2)}

REFERENCE DATA:
Purchase Orders: ${JSON.stringify(pos)}
Delivery Notes: ${JSON.stringify(dns)}

DETECT:
- serviceDate from "Leistungsdatum"
- poNumber by matching line items to POs (single match = high confidence)
- VAT recalc if "MwSt. inkl." or "incl. VAT"
- currency from rawText if missing
- SKU "FREIGHT" for "Seefracht", "Shipping", "Transport"
- discountTerms from "Skonto" text
- flag duplicates ("duplicate", "erneute")

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "field": "string",
      "value": any,
      "reason": "Clear reason + mention if learned from past",
      "confidence": number
    }
  ],
  "reasoning": "Explain confidence and if human review needed"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean possible markdown
    const jsonText = text.replace(/```json\n?|```/g, '').trim();

    const parsed = JSON.parse(jsonText);

    // Ensure suggestions is array and has required fields
    const safeSuggestions = (parsed.suggestions || []).map((s: any) => ({
      field: s.field || "",
      value: s.value,
      reason: s.reason || "AI suggestion",
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.7
    }));

    return {
      suggestions: safeSuggestions,
      reasoning: parsed.reasoning || "Gemini analysis completed."
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      suggestions: [],
      reasoning: "AI unavailable — escalating to human review."
    };
  }
}


// t