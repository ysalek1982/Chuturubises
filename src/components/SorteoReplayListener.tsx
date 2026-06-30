import { useEffect, useRef, useState } from "react";
import {
  supabase,
  type Profile,
  type TurnGroup,
  type TurnGroupMember,
} from "@/lib/supabase";
import { SorteoBatchOverlay, type BatchGroup } from "./SorteoBatchOverlay";
import { findTheme } from "@/lib/turn-themes";
import { isSelfSorteo } from "@/lib/sorteo-self";
import type { TurnRole } from "@/lib/supabase";

// Order roles consistently inside each group
const ROLE_ORDER: Record<TurnRole, number> = {
  churrasquero: 0,
  compras: 1,
  ayudante: 2,
};

export function SorteoReplayListener() {
  const [batch, setBatch] = useState<BatchGroup[] | null>(null);
  const pendingRef = useRef<Map<string, TurnGroup>>(new Map());
  const flushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const flush = async () => {
      const incoming = Array.from(pendingRef.current.values());
      pendingRef.current.clear();
      flushTimerRef.current = null;

      // Drop self-inserted groups (the admin who triggered it already sees the overlay)
      const externals = incoming.filter((g) => !isSelfSorteo(g.id));
      if (externals.length === 0) return;

      const ids = externals.map((g) => g.id);
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.from("turn_group_members").select("*").in("group_id", ids),
        supabase.from("profiles").select("*").neq("approval_status", "rejected"),
      ]);
      const members = (m as TurnGroupMember[]) ?? [];
      const profiles = (p as Profile[]) ?? [];

      const built: BatchGroup[] = externals
        .map((g) => {
          const groupMembers = members
            .filter((mm) => mm.group_id === g.id)
            .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
          if (groupMembers.length === 0) return null;
          return {
            id: g.id,
            turn_date: g.turn_date,
            theme: findTheme(g.theme),
            members: groupMembers
              .map((mm) => {
                const profile = profiles.find((pr) => pr.id === mm.profile_id);
                return profile ? { profile, role: mm.role } : null;
              })
              .filter(Boolean) as BatchGroup["members"],
          };
        })
        .filter(Boolean) as BatchGroup[];

      built.sort((a, b) => (a.turn_date < b.turn_date ? -1 : 1));
      if (built.length > 0) setBatch(built);
    };

    const channel = supabase
      .channel("sorteo-replays")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "turn_groups" },
        (payload) => {
          const group = payload.new as TurnGroup;
          pendingRef.current.set(group.id, group);
          if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
          // Wait for the rest of the bulk insert + member inserts to land
          flushTimerRef.current = window.setTimeout(flush, 2200);
        },
      )
      .subscribe();

    return () => {
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!batch) return null;
  return (
    <SorteoBatchOverlay
      groups={batch}
      isReplay
      onClose={() => setBatch(null)}
    />
  );
}
