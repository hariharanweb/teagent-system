/** Strips ```json fences (models often add them despite instructions) before parsing. */
export function extractJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText ?? trimmed);
}
