import { formatBoliviaDateTime } from "./bolivia-time";
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

const OFFICIAL_MATCH_CONTEXT: Record<string, { match: string; route: string }> = {
  "MATCH 89": { match: "Match 89", route: "Paraguay vs France, Round of 16" },
  "MATCH 90": { match: "Match 90", route: "Canada vs Morocco, Round of 16" },
  "MATCH 91": { match: "Match 91", route: "Brazil vs Norway, Round of 16" },
  QF1: { match: "Match 97", route: "Winner Match 89 vs Winner Match 90" },
  QF2: { match: "Match 98", route: "Winner Match 93 vs Winner Match 94" },
  QF3: { match: "Match 99", route: "Winner Match 91 vs Winner Match 92" },
  QF4: { match: "Match 100", route: "Winner Match 95 vs Winner Match 96" },
  "MATCH 97": { match: "Match 97", route: "Winner Match 89 vs Winner Match 90" },
  "MATCH 98": { match: "Match 98", route: "Winner Match 93 vs Winner Match 94" },
  "MATCH 99": { match: "Match 99", route: "Winner Match 91 vs Winner Match 92" },
  "MATCH 100": { match: "Match 100", route: "Winner Match 95 vs Winner Match 96" },
};

function officialContext(match: WorldCupMatch) {
  const key = match.code.trim().toUpperCase();
  const mapped = OFFICIAL_MATCH_CONTEXT[key];
  if (!mapped) return `${match.code} - ${match.home_team} vs ${match.away_team}`;

  return `${mapped.match} (${mapped.route}) - ${match.home_team} vs ${match.away_team}`;
}

function hasPlaceholderTeams(match: WorldCupMatch) {
  return /ganador|winner|por definir|tbd/i.test(`${match.home_team} ${match.away_team}`);
}

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
  if (new Date(match.kickoff_at).getTime() > Date.now()) {
    return {
      status: "not_final",
      home_score: null,
      away_score: null,
      confidence: "high",
      summary: `El partido ${match.home_team} vs ${match.away_team} aun no se jugo.`,
    } satisfies GeminiMatchResult;
  }

  const prompt = `
Busca en la web el resultado del partido de futbol del Mundial:
${match.stage} ${officialContext(match)}
${match.home_team} vs ${match.away_team}
Sede: ${match.venue ?? "por definir"}
Fecha Bolivia: ${formatBoliviaDateTime(match.kickoff_at)}
Fecha UTC: ${new Date(match.kickoff_at).toISOString()}

Nota importante:
${hasPlaceholderTeams(match)
  ? "Los equipos pueden aparecer como 'Ganador partido ...' porque el cruce aun depende de octavos. Para encontrar el resultado usa principalmente el numero oficial del partido FIFA, la sede y la fecha."
  : "Usa el numero oficial del partido FIFA, los equipos, la sede y la fecha para confirmar el marcador."}

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
    if (response.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(body)) {
      throw new Error("Cuota de Gemini agotada. Revisa billing o limites en Google AI Studio.");
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error("Gemini rechazo la API key o la configuracion. Revisa la key en Admin > Penca.");
    }
    throw new Error(`Gemini no respondio (${response.status}): ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini no devolvio contenido");
  return parseGeminiJson(text);
}
