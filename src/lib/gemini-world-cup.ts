import type { WorldCupMatch } from "./supabase";

type GeminiResponsePart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
};

export type GeminiMatchResult = {
  status: "final" | "not_final" | "unknown";
  home_score: number | null;
  away_score: number | null;
  confidence: "high" | "medium" | "low";
  summary: string;
};

function parseGeminiJson(text: string): GeminiMatchResult {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(clean) as Partial<GeminiMatchResult>;
  return {
    status: parsed.status ?? "unknown",
    home_score: typeof parsed.home_score === "number" ? parsed.home_score : null,
    away_score: typeof parsed.away_score === "number" ? parsed.away_score : null,
    confidence: parsed.confidence ?? "low",
    summary: parsed.summary ?? "Sin resumen",
  };
}

export async function askGeminiForMatchResult(apiKey: string, match: WorldCupMatch) {
  const prompt = `
Busca en la web el resultado del partido de futbol del Mundial:
${match.stage} ${match.code}
${match.home_team} vs ${match.away_team}
Sede: ${match.venue ?? "por definir"}
Fecha: ${new Date(match.kickoff_at).toISOString()}

Devuelve SOLO JSON valido con esta forma:
{
  "status": "final" | "not_final" | "unknown",
  "home_score": number | null,
  "away_score": number | null,
  "confidence": "high" | "medium" | "low",
  "summary": "explicacion breve"
}

Usa "final" solamente si el partido ya termino y encontraste un marcador final confiable.
Si aun no se jugo, devuelve "not_final".
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini no respondio (${response.status}): ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini no devolvio contenido");
  return parseGeminiJson(text);
}
