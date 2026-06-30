import { supabase } from "./supabase";

export type AwardCategory = {
  key: string;
  emoji: string;
  title: string;
  tagline: string;
};

export const AWARD_CATEGORIES: AwardCategory[] = [
  { key: "borracho", emoji: "🍻", title: "El más borracho", tagline: "El que cae redondito al amanecer" },
  { key: "malo_pelota", emoji: "⚽", title: "El más malo pa jugar pelota", tagline: "Patadón al aire garantizado" },
  { key: "mentiroso", emoji: "🤥", title: "El más mentiroso", tagline: "Cuentista nivel telenovela" },
  { key: "tacaño", emoji: "🦀", title: "El más tacaño", tagline: "Le aprieta hasta el chinche" },
  { key: "falluti", emoji: "👻", title: "El más falluti", tagline: "Promete y nunca aparece" },
  { key: "catarro", emoji: "🤧", title: "El más catarro", tagline: "El más insoportable en yema" },
  { key: "larguero", emoji: "🗣️", title: "El más larguero", tagline: "Charla sin pausa ni respiro" },
];

const KEY_OPEN = "awards_voting_open";
const KEY_YEAR = "awards_current_year";

export async function loadAwardsSettings() {
  const { data } = await supabase
    .from("fraternity_settings")
    .select("key,value")
    .in("key", [KEY_OPEN, KEY_YEAR]);
  const map = Object.fromEntries(((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  return {
    isOpen: map[KEY_OPEN] === "true",
    year: map[KEY_YEAR] ? parseInt(map[KEY_YEAR], 10) : new Date().getFullYear(),
  };
}

export async function saveAwardsSettings(isOpen: boolean, year: number) {
  const now = new Date().toISOString();
  return supabase.from("fraternity_settings").upsert(
    [
      { key: KEY_OPEN, value: String(isOpen), updated_at: now },
      { key: KEY_YEAR, value: String(year), updated_at: now },
    ],
    { onConflict: "key" },
  );
}
