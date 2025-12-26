// src/agent.ts
import type { Invoice, HumanReview } from "./types.ts";
import dotenv from "dotenv";
import process from "process";
import { parseAIJson } from "../utlis/parseJson.ts";

dotenv.config(); // <-- THIS IS THE KEY FIX

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
        `Invoice ${r.invoiceId} (${r.vendor}): Corrections → ${JSON.stringify(
          r.corrections
        )}`
    )
    .join("\n");

  const prompt = `
    You are a cautious AI agent. You ONLY give high confidence (>0.85) when the pattern exactly matches a past human correction.

    If no past human correction exists for this vendor, be conservative — confidence < 0.8

    Past human corrections:
    ${examples || "NONE — be very cautious, low confidence"}

    Current invoice:
    Vendor: ${invoice.vendor}
    ID: ${invoice.invoiceId}
    Raw text: """${invoice.rawText}"""
    Extracted fields: ${JSON.stringify(invoice.fields, null, 2)}

    Reference data:
    POs: ${JSON.stringify(pos.slice(0, 5))}
    DNs: ${JSON.stringify(dns.slice(0, 5))}

    Return ONLY valid JSON with this structure:
    {
      "suggestions": [{ "field": "string", "value": "any", "reason": "string", "confidence": number }],
      "reasoning": "string"
    }
`;

  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY not found. Check .env file and dotenv.config()."
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b:free",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return parseAIJson<AIResponse>(data.choices[0].message.content);
  } catch (error) {
    console.error("Error fetching AI suggestions:", error);
    return { suggestions: [], reasoning: "AI suggestion failed." };
  }
}

let exampleInvoice: Invoice = {
  invoiceId: "INV-EX-001",
  vendor: "Supplier GmbH",
  fields: { serviceDate: null, grossTotal: 1200 },
  confidence: 0.75,
  rawText: "Rechnung vom 15.03.2024 ... Leistungsdatum fehlt ...",
};
getAISuggestions(exampleInvoice, [], [], []).then((res) => {
  console.log("AI Suggestions:", res);
});
