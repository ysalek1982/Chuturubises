import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type AppRole, type Profile } from "./supabase";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  canManageFinance: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const TREASURER_USER_ID = "eed4d397-61f5-43f8-9f3e-70202a9158e6";
const VICE_PRESIDENT_ADMIN_USER_ID = "796d0128-8cac-4c5f-b17b-2bd8bf4a05c2";

const specialRoleForUser = (userId: string): AppRole | null => {
  if (userId === VICE_PRESIDENT_ADMIN_USER_ID) return "admin";
  if (userId === TREASURER_USER_ID) return "treasurer";
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fallbackProfileForUser = (user: User): Profile => {
    const fallbackName =
      typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : (user.email ?? "Fraterno");
    const fallbackNickname =
      typeof user.user_metadata.nickname === "string" && user.user_metadata.nickname.trim()
        ? user.user_metadata.nickname.trim()
        : fallbackName.split("@")[0];
    const avatarUrl =
      typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;
    const now = new Date().toISOString();

    return {
      id: user.id,
      full_name: fallbackName,
      nickname: fallbackNickname,
      avatar_url: avatarUrl,
      approval_status: "approved",
      approved_at: now,
      approved_by: user.id,
      created_at: now,
      birth_date: null,
      tshirt_size: null,
    };
  };

  const createMissingProfile = async (user: User): Promise<Profile> => {
    const fallbackProfile = fallbackProfileForUser(user);

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: fallbackProfile.full_name,
          nickname: fallbackProfile.nickname,
          avatar_url: fallbackProfile.avatar_url,
        },
        { onConflict: "id" },
      )
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("No se pudo crear la ficha del fraterno", error);
      return fallbackProfile;
    }

    return (data as Profile | null) ?? fallbackProfile;
  };

  const loadAccount = async (user: User) => {
    const userId = user.id;
    const [{ data }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const nextProfile = (data as Profile | null) ?? (await createMissingProfile(user));
    setProfile(nextProfile);
    const dbRole = roles?.some((row) => row.role === "admin")
      ? "admin"
      : roles?.some((row) => row.role === "treasurer")
        ? "treasurer"
      : ((roles?.[0]?.role as AppRole | undefined) ?? null);
    const nextRole = specialRoleForUser(userId) ?? dbRole;
    setRole(nextRole);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadAccount(data.session.user).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setLoading(true);
        loadAccount(s.user).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        isAdmin: role === "admin",
        canManageFinance: role === "admin" || role === "treasurer",
        loading,
        refreshProfile: async () => session?.user && loadAccount(session.user),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
