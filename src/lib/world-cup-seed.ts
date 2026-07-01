import { supabase } from "./supabase";

const CONFIRMED_ROUND_OF_16_MATCHES = [
  {
    code: "Match 89",
    stage: "Octavos de final",
    home_team: "Paraguay",
    away_team: "Francia",
    venue: "Philadelphia Stadium",
    kickoff_at: "2026-07-04T17:00:00-04:00",
    status: "scheduled",
  },
  {
    code: "Match 90",
    stage: "Octavos de final",
    home_team: "Canada",
    away_team: "Marruecos",
    venue: "Houston Stadium",
    kickoff_at: "2026-07-04T13:00:00-04:00",
    status: "scheduled",
  },
  {
    code: "Match 91",
    stage: "Octavos de final",
    home_team: "Brasil",
    away_team: "Noruega",
    venue: "New York New Jersey Stadium",
    kickoff_at: "2026-07-05T16:00:00-04:00",
    status: "scheduled",
  },
] as const;

let seedAttempted = false;

export async function ensureWorldCupMatchesSeeded() {
  if (seedAttempted) return { seeded: false, skipped: true };
  seedAttempted = true;

  const codes = CONFIRMED_ROUND_OF_16_MATCHES.map((match) => match.code);
  const { data, error } = await supabase.from("world_cup_matches").select("code").in("code", codes);
  if (error) throw error;

  const existingCodes = new Set((data ?? []).map((row) => row.code));
  const missingMatches = CONFIRMED_ROUND_OF_16_MATCHES.filter((match) => !existingCodes.has(match.code));
  if (!missingMatches.length) return { seeded: false, skipped: false };

  await supabase
    .from("world_cup_matches")
    .delete()
    .in("code", ["QF1", "QF2", "QF3", "QF4", "Match 97", "Match 98", "Match 99", "Match 100"]);

  const { error: upsertError } = await supabase.from("world_cup_matches").upsert(CONFIRMED_ROUND_OF_16_MATCHES, {
    onConflict: "code",
  });
  if (upsertError) throw upsertError;

  return { seeded: true, skipped: false };
}
