export function parseAIJson<T = any>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("AI response is empty or not a string");
  }

  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/'''json/gi, "")
    .replace(/'''/g, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("❌ Failed to parse AI JSON");
    console.error("RAW RESPONSE:\n", raw);
    throw err;
  }
}
