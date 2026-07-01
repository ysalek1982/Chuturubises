import type { Profile, WorldCupMatch, WorldCupPrediction } from "./supabase";

export function scorePrediction(match: WorldCupMatch, prediction?: WorldCupPrediction | null) {
  if (!prediction || match.status !== "final" || match.home_score === null || match.away_score === null) {
    return 0;
  }

  const exact = prediction.home_score === match.home_score && prediction.away_score === match.away_score;
  if (exact) return 3;

  const realSign = Math.sign(match.home_score - match.away_score);
  const predictedSign = Math.sign(prediction.home_score - prediction.away_score);
  return realSign === predictedSign ? 1 : 0;
}

export function buildLeaderboard(
  profiles: Profile[],
  matches: WorldCupMatch[],
  predictions: WorldCupPrediction[],
) {
  return profiles
    .map((profile) => {
      const total = matches.reduce((sum, match) => {
        const prediction = predictions.find((p) => p.profile_id === profile.id && p.match_id === match.id);
        return sum + scorePrediction(match, prediction);
      }, 0);
      const exacts = matches.filter((match) => {
        const prediction = predictions.find((p) => p.profile_id === profile.id && p.match_id === match.id);
        return prediction && scorePrediction(match, prediction) === 3;
      }).length;
      return { profile, total, exacts };
    })
    .sort((a, b) => b.total - a.total || b.exacts - a.exacts || a.profile.nickname.localeCompare(b.profile.nickname));
}
