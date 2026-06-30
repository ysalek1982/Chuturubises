import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { supabase, type Profile } from "@/lib/supabase";
import { AWARD_CATEGORIES, loadAwardsSettings, type AwardCategory } from "@/lib/awards";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Trophy, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { toast } from "sonner";

export const Route = createFileRoute("/premios")({
  ssr: false,
  head: () => ({ meta: [{ title: "Premios Chuturubises" }] }),
  component: PremiosPage,
});

type VoteRow = { category: string; nominee_id: string; voter_id: string };

function PremiosPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState<boolean | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [members, setMembers] = useState<Profile[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [allVotes, setAllVotes] = useState<VoteRow[]>([]);
  const [picking, setPicking] = useState<AwardCategory | null>(null);
  const [search, setSearch] = useState("");
  const [confettiKey, setConfettiKey] = useState(0);

  const load = async () => {
    const settings = await loadAwardsSettings();
    const y = settings.year;
    setOpen(settings.isOpen);
    setYear(y);

    // Todos los fraternos (incluidos administradores) pueden ser votados.
    const { data: profs } = await supabase
      .from("profiles")
      .select("*")
      .neq("approval_status", "rejected")
      .order("full_name");
    setMembers((profs as Profile[]) ?? []);

    const { data: votes } = await supabase
      .from("awards_votes")
      .select("category,nominee_id,voter_id")
      .eq("year", y);
    const rows = (votes as VoteRow[]) ?? [];
    setAllVotes(rows);
    if (user) {
      const mine: Record<string, string> = {};
      rows.filter((r) => r.voter_id === user.id).forEach((r) => (mine[r.category] = r.nominee_id));
      setMyVotes(mine);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const submitVote = async (category: string, nominee_id: string) => {
    if (!user) return;
    if (nominee_id === user.id) return toast.error("No puedes votar por ti mismo 😅");
    const prev = myVotes[category];
    // optimistic
    setMyVotes((p) => ({ ...p, [category]: nominee_id }));
    setAllVotes((rows) => {
      const filtered = rows.filter((r) => !(r.category === category && r.voter_id === user.id));
      return [...filtered, { category, nominee_id, voter_id: user.id }];
    });
    setConfettiKey((k) => k + 1);
    const { error } = await supabase
      .from("awards_votes")
      .upsert(
        { year, category, voter_id: user.id, nominee_id },
        { onConflict: "year,category,voter_id" },
      );
    if (error) {
      // rollback
      setMyVotes((p) => ({ ...p, [category]: prev ?? "" }));
      return toast.error(error.message);
    }
    setPicking(null);
  };

  const winners = useMemo(() => {
    const map: Record<string, { id: string; count: number }> = {};
    for (const cat of AWARD_CATEGORIES) {
      const tally: Record<string, number> = {};
      allVotes
        .filter((v) => v.category === cat.key)
        .forEach((v) => (tally[v.nominee_id] = (tally[v.nominee_id] ?? 0) + 1));
      let best: { id: string; count: number } | null = null;
      Object.entries(tally).forEach(([id, count]) => {
        if (!best || count > best.count) best = { id, count };
      });
      if (best) map[cat.key] = best;
    }
    return map;
  }, [allVotes]);

  const findMember = (id: string) => members.find((m) => m.id === id);

  if (open === null) {
    return (
      <AppShell>
        <PageHeader title="Premios" subtitle="Chuturubises" />
        <div className="p-8 text-center text-neutral-400">Cargando gala…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative min-h-dvh overflow-hidden bg-[#111111]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(ellipse at top, rgba(255,196,0,0.25), transparent 60%)" }} />
        <div className="relative z-10">
          <PageHeader title="Premios" subtitle="Chuturubises Gala" />
          <ConfettiBurst trigger={confettiKey} count={60} />

          {open ? (
            <VotingView
              categories={AWARD_CATEGORIES}
              members={members}
              myVotes={myVotes}
              allVotes={allVotes}
              year={year}
              currentUserId={user?.id}
              onVote={submitVote}
              findMember={findMember}
            />
          ) : (
            <ResultsView
              categories={AWARD_CATEGORIES}
              winners={winners}
              findMember={findMember}
              year={year}
            />
          )}
        </div>
      </div>

      <Dialog open={!!picking} onOpenChange={(o) => { if (!o) { setPicking(null); setSearch(""); } }}>
        <DialogContent className="max-h-[85vh] overflow-hidden border-[#FFC400]/40 bg-[#111111] p-0 text-neutral-100">
          {picking && (() => {
            const tally: Record<string, number> = {};
            allVotes.filter((v) => v.category === picking.key).forEach((v) => {
              tally[v.nominee_id] = (tally[v.nominee_id] ?? 0) + 1;
            });
            const q = search.trim().toLowerCase();
            const candidates = members
              .filter((m) => m.id !== user?.id)
              .filter((m) => !q || (m.nickname ?? "").toLowerCase().includes(q) || (m.full_name ?? "").toLowerCase().includes(q))
              .sort((a, b) => (tally[b.id] ?? 0) - (tally[a.id] ?? 0) || (a.nickname ?? a.full_name).localeCompare(b.nickname ?? b.full_name));
            return (
              <div className="flex max-h-[85vh] flex-col">
                <DialogHeader className="border-b border-neutral-800 px-5 pb-3 pt-5">
                  <DialogTitle className="text-2xl text-[#FFC400]" style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.05em" }}>
                    {picking.emoji} {picking.title}
                  </DialogTitle>
                  <p className="text-xs text-neutral-400">{picking.tagline}</p>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <Input
                      autoFocus
                      placeholder="Buscar fraterno…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="border-neutral-800 bg-black/60 pl-9 text-sm text-neutral-100 placeholder:text-neutral-600"
                    />
                  </div>
                </DialogHeader>
                <div className="overflow-y-auto px-3 py-3">
                  {candidates.length === 0 ? (
                    <p className="py-10 text-center text-sm text-neutral-500">Sin coincidencias 🐝</p>
                  ) : (
                    <ul className="space-y-2">
                      {candidates.map((m) => {
                        const selected = myVotes[picking.key] === m.id;
                        const count = tally[m.id] ?? 0;
                        return (
                          <li key={m.id}>
                            <button
                              onClick={() => submitVote(picking.key, m.id)}
                              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                                selected
                                  ? "border-[#FFC400] bg-[#FFC400]/10 shadow-[0_0_15px_rgba(255,196,0,0.25)]"
                                  : "border-neutral-800 bg-black/40 hover:border-[#FFC400]/60 active:scale-[0.99]"
                              }`}
                            >
                              <Avatar className="h-12 w-12 ring-2 ring-[#FFC400]/30">
                                <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                                <AvatarFallback>{m.nickname?.[0] ?? "?"}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-neutral-100">{m.nickname || m.full_name}</p>
                                {m.nickname && <p className="truncate text-[11px] text-neutral-500">{m.full_name}</p>}
                              </div>
                              {count > 0 && (
                                <span className="rounded-full bg-[#FFC400]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFC400]">
                                  {count} voto{count === 1 ? "" : "s"}
                                </span>
                              )}
                              {selected && (
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFC400] text-black">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {myVotes[picking.key] && (
                  <div className="border-t border-neutral-800 p-3">
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-neutral-400 hover:text-[#FFC400]"
                      onClick={() => { setPicking(null); setSearch(""); }}
                    >
                      Listo, siguiente categoría →
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function VotingView({
  categories,
  members,
  myVotes,
  allVotes,
  year,
  currentUserId,
  onVote,
}: {
  categories: AwardCategory[];
  members: Profile[];
  myVotes: Record<string, string>;
  allVotes: VoteRow[];
  year: number;
  currentUserId?: string;
  onVote: (category: string, nominee_id: string) => void;
  findMember: (id: string) => Profile | undefined;
}) {
  const [query, setQuery] = useState("");
  const total = categories.length;
  const done = categories.filter((c) => myVotes[c.key]).length;
  const eligible = members.filter((m) => m.id !== currentUserId);
  const pct = Math.round((done / total) * 100);

  return (
    <div className="space-y-5 px-3 pb-12 pt-4">
      {/* Sticky progress hero */}
      <div className="sticky top-2 z-20 rounded-2xl border border-[#FFC400]/40 bg-black/85 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FFC400]/15 ring-2 ring-[#FFC400]/60">
            <Sparkles className="h-6 w-6 text-[#FFC400]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-xl font-black uppercase text-[#FFC400]"
              style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.05em" }}
            >
              Premios {year}
            </h2>
            <p className="truncate text-[11px] text-neutral-400">
              Tocá la cara del fraterno en cada categoría 🐝
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-black leading-none text-[#FFC400]">
              {done}
              <span className="text-neutral-600">/{total}</span>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">votadas</div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-900">
          <div
            className="h-full bg-gradient-to-r from-[#FF2E93] via-[#FFC400] to-[#00E0FF] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Global search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Buscar fraterno por apodo o nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-neutral-800 bg-black/60 pl-9 text-sm text-neutral-100 placeholder:text-neutral-600"
        />
      </div>

      <ul className="space-y-4">
        {categories.map((c) => {
          const tally: Record<string, number> = {};
          allVotes.filter((v) => v.category === c.key).forEach((v) => {
            tally[v.nominee_id] = (tally[v.nominee_id] ?? 0) + 1;
          });
          const q = query.trim().toLowerCase();
          const filtered = eligible.filter(
            (m) =>
              !q ||
              (m.nickname ?? "").toLowerCase().includes(q) ||
              (m.full_name ?? "").toLowerCase().includes(q),
          );
          const sorted = [...filtered].sort(
            (a, b) =>
              (tally[b.id] ?? 0) - (tally[a.id] ?? 0) ||
              (a.nickname ?? a.full_name).localeCompare(b.nickname ?? b.full_name),
          );
          const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);
          const maxCount = totalVotes > 0 ? Math.max(...Object.values(tally)) : 0;
          const votedId = myVotes[c.key];
          const votedMember = votedId ? eligible.find((m) => m.id === votedId) : undefined;

          return (
            <li
              key={c.key}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-br from-black to-neutral-950 transition ${
                votedId
                  ? "border-[#FFC400]/70 shadow-[0_0_25px_rgba(255,196,0,0.18)]"
                  : "border-neutral-800"
              }`}
            >
              <div className="flex items-center gap-3 border-b border-neutral-800/80 bg-black/40 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFC400]/10 text-2xl ring-1 ring-[#FFC400]/30">
                  {c.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-base font-black uppercase tracking-wide text-neutral-100"
                    style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.06em" }}
                  >
                    {c.title}
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">{c.tagline}</p>
                </div>
                {totalVotes > 0 && (
                  <span className="shrink-0 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-400">
                    {totalVotes} {totalVotes === 1 ? "voto" : "votos"}
                  </span>
                )}
              </div>

              {votedMember && (
                <div className="flex items-center gap-2 bg-[#FFC400]/10 px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-[#FFC400]" strokeWidth={3} />
                  <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[#FFC400]">
                    Tu voto: {votedMember.nickname || votedMember.full_name}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] text-neutral-500">tocá otro para cambiar</span>
                </div>
              )}

              <div className="p-3">
                {sorted.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-500">Sin coincidencias 🐝</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                    {sorted.map((m) => {
                      const selected = votedId === m.id;
                      const count = tally[m.id] ?? 0;
                      const isLeader = count > 0 && count === maxCount;
                      return (
                        <button
                          key={m.id}
                          onClick={() => onVote(c.key, m.id)}
                          aria-pressed={selected}
                          aria-label={`Votar por ${m.nickname || m.full_name}`}
                          className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition active:scale-95 ${
                            selected
                              ? "border-[#FFC400] bg-[#FFC400]/10"
                              : "border-neutral-800 bg-black/40 hover:border-[#FFC400]/60"
                          }`}
                        >
                          <div className="relative">
                            <Avatar
                              className={`h-14 w-14 transition ${
                                selected
                                  ? "shadow-[0_0_18px_rgba(255,196,0,0.7)] ring-2 ring-[#FFC400]"
                                  : isLeader
                                    ? "ring-2 ring-[#FF2E93]/70"
                                    : "ring-1 ring-neutral-700 group-hover:ring-[#FFC400]/50"
                              }`}
                            >
                              <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                              <AvatarFallback>{m.nickname?.[0] ?? "?"}</AvatarFallback>
                            </Avatar>
                            {selected && (
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFC400] text-black shadow">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                            )}
                            {!selected && isLeader && count > 0 && (
                              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#FF2E93] text-[10px] shadow">
                                👑
                              </span>
                            )}
                            {count > 0 && !selected && !isLeader && (
                              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-[#FFC400] ring-1 ring-[#FFC400]/50">
                                {count}
                              </span>
                            )}
                          </div>
                          <span className="line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight text-neutral-200">
                            {m.nickname || m.full_name}
                          </span>
                          {count > 0 && (
                            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-900">
                              <div
                                className={`h-full ${
                                  selected ? "bg-[#FFC400]" : isLeader ? "bg-[#FF2E93]" : "bg-neutral-700"
                                }`}
                                style={{ width: `${Math.round((count / Math.max(1, totalVotes)) * 100)}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResultsView({
  categories,
  winners,
  findMember,
  year,
}: {
  categories: AwardCategory[];
  winners: Record<string, { id: string; count: number }>;
  findMember: (id: string) => Profile | undefined;
  year: number;
}) {
  return (
    <div className="space-y-4 px-4 pb-8 pt-4">
      <div className="rounded-2xl border border-[#FFC400]/40 bg-gradient-to-br from-[#1a1500] via-black to-[#1a1500] p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-[#FFC400] drop-shadow-[0_0_15px_rgba(255,196,0,0.7)]" />
        <h2 className="mt-2 text-3xl font-black uppercase text-[#FFC400]" style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.08em" }}>
          Gala {year}
        </h2>
        <p className="mt-1 text-xs text-neutral-300">¡Los ganadores oficiales del enjambre!</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((c) => {
          const w = winners[c.key];
          const m = w ? findMember(w.id) : undefined;
          return (
            <div
              key={c.key}
              className="relative overflow-hidden rounded-2xl border-2 border-[#FFC400]/60 bg-gradient-to-b from-black to-[#1a1500] p-4 text-center"
              style={{ boxShadow: "0 0 25px rgba(255,196,0,0.25)" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full blur-2xl"
                style={{ background: "rgba(255,196,0,0.4)" }}
              />
              <div className="relative">
                <div className="text-4xl">{c.emoji}</div>
                {m ? (
                  <>
                    <Avatar className="mx-auto mt-3 h-20 w-20 ring-4 ring-[#FFC400] shadow-[0_0_25px_rgba(255,196,0,0.6)]">
                      <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                      <AvatarFallback>{m.nickname?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <p className="mt-2 text-base font-black text-white">{m.nickname || m.full_name}</p>
                  </>
                ) : (
                  <p className="mt-6 text-sm italic text-neutral-500">Sin votos en esta categoría</p>
                )}
                <p
                  className="mt-2 text-sm font-bold uppercase text-[#FFC400]"
                  style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.05em" }}
                >
                  {c.title} {year}
                </p>
                {w && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {w.count} voto{w.count === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="pt-2 text-center text-xs text-neutral-500">
        <Link to="/" className="underline">
          Volver al muro
        </Link>
      </p>
    </div>
  );
}
