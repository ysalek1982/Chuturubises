import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AppRole = "admin" | "member";

export type Profile = {
  id: string;
  full_name: string;
  nickname: string;
  avatar_url: string | null;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  birth_date: string | null;
  tshirt_size: string | null;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
};

export type Turno = {
  id: string;
  profile_id: string;
  drawn_at: string;
  cycle: number;
};

export type TurnRole = "churrasquero" | "compras" | "ayudante";

export type TurnGroup = {
  id: string;
  turn_date: string; // YYYY-MM-DD
  cycle: number;
  archived: boolean;
  created_at: string;
  created_by: string | null;
  theme: string | null;
};

export type TurnGroupMember = {
  id: string;
  group_id: string;
  profile_id: string;
  role: TurnRole;
  created_at: string;
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

export type Fee = {
  id: string;
  title: string;
  amount: number;
  due_date: string | null;
  created_at: string;
};

export type PaymentStatus = "pending" | "reviewing" | "paid";

export type FeePayment = {
  id: string;
  fee_id: string;
  profile_id: string;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  receipt_url: string | null;
};

export type PhotoAlbumItem = {
  id: string;
  profile_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export type TurnRating = {
  id: string;
  turn_id: string;
  profile_id: string;
  rating_value: number; // 1..5
  comment: string | null;
  created_at: string;
};

export type TurnRatingStat = {
  turn_id: string;
  avg_rating: number;
  rating_count: number;
};

export type AppNotification = {
  id: string;
  profile_id: string;
  title: string;
  body: string | null;
  kind: string;
  read: boolean;
  created_at: string;
};
