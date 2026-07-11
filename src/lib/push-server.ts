import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webPush from "web-push";

type PushSubscriptionRow = {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationRow = {
  id: string;
  profile_id: string;
  title: string;
  body: string | null;
  kind: string;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let serviceClient: SupabaseClient | null = null;
let webPushReady = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function env(name: string) {
  return process.env[name] ?? "";
}

function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient;

  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

function configureWebPush() {
  if (webPushReady) return;
  const publicKey = env("VAPID_PUBLIC_KEY") || env("VITE_VAPID_PUBLIC_KEY");
  const privateKey = env("VAPID_PRIVATE_KEY");
  const subject = env("VAPID_SUBJECT") || "https://chuturubises.vercel.app";
  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID_PUBLIC_KEY/VITE_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY");
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  webPushReady = true;
}

async function readAuthUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function sendPushToProfile(profileId: string, payload: PushPayload) {
  configureWebPush();
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("profile_id", profileId);

  const subscriptions = (data as PushSubscriptionRow[] | null) ?? [];
  let sent = 0;
  let expired = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          expired += 1;
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.warn("Push send failed", error?.message ?? error);
        }
      }
    }),
  );

  return { sent, expired, subscriptions: subscriptions.length };
}

function boliviaDayRangeUtc() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const start = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00-04:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function handleTest(request: Request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const user = await readAuthUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const supabase = getSupabaseServiceClient();
  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      profile_id: user.id,
      title: "Avisos activados",
      body: "Este telefono ya puede recibir novedades Chuturubis.",
      kind: "push_test",
      read: false,
    })
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);

  const result = await sendPushToProfile(user.id, {
    title: "Avisos Chuturubis activos",
    body: "Listo, este telefono recibira novedades importantes.",
    url: "/",
    tag: `push-test-${user.id}`,
  });

  return json({ ok: true, notification, push: result });
}

async function handleBirthdays(request: Request) {
  if (request.method !== "POST" && request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }
  const secret = env("CRON_SECRET");
  const bearer = request.headers.get("authorization") === `Bearer ${secret}`;
  const manual = request.headers.get("x-cron-secret") === secret;
  if (secret && !bearer && !manual) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = getSupabaseServiceClient();
  const { data: queued, error: queueError } = await supabase.rpc("queue_birthday_notifications");
  if (queueError) return json({ error: queueError.message }, 500);

  const { start, end } = boliviaDayRangeUtc();
  const { data: notifications, error: notificationError } = await supabase
    .from("notifications")
    .select("id, profile_id, title, body, kind")
    .eq("kind", "birthday")
    .is("push_sent_at", null)
    .gte("created_at", start)
    .lt("created_at", end);

  if (notificationError) return json({ error: notificationError.message }, 500);

  const rows = (notifications as NotificationRow[] | null) ?? [];
  let sent = 0;
  let subscriptions = 0;
  let expired = 0;

  for (const row of rows) {
    const result = await sendPushToProfile(row.profile_id, {
      title: row.title,
      body: row.body ?? "Hay cumpleaños en el enjambre.",
      url: "/calendario",
      tag: row.id,
    });
    sent += result.sent;
    subscriptions += result.subscriptions;
    expired += result.expired;
  }

  if (rows.length) {
    await supabase
      .from("notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .in(
        "id",
        rows.map((row) => row.id),
      );
  }

  return json({ ok: true, queued, notifications: rows.length, sent, subscriptions, expired });
}

function financeNotificationUrl(kind: string) {
  if (kind === "finance_receipt_submitted") return "/admin";
  return "/finanzas";
}

async function handleFinance(request: Request) {
  if (request.method !== "POST" && request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = env("CRON_SECRET");
  const bearer = secret && request.headers.get("authorization") === `Bearer ${secret}`;
  const manual = secret && request.headers.get("x-cron-secret") === secret;
  const authUser = bearer || manual ? null : await readAuthUser(request);
  if (!bearer && !manual && !authUser) return json({ error: "Unauthorized" }, 401);

  const supabase = getSupabaseServiceClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, profile_id, title, body, kind")
    .like("kind", "finance_%")
    .is("push_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return json({ error: error.message }, 500);

  const rows = (notifications as NotificationRow[] | null) ?? [];
  let sent = 0;
  let subscriptions = 0;
  let expired = 0;

  for (const row of rows) {
    const result = await sendPushToProfile(row.profile_id, {
      title: row.title,
      body: row.body ?? "Hay una novedad de finanzas.",
      url: financeNotificationUrl(row.kind),
      tag: row.id,
    });
    sent += result.sent;
    subscriptions += result.subscriptions;
    expired += result.expired;
  }

  if (rows.length) {
    await supabase
      .from("notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .in(
        "id",
        rows.map((row) => row.id),
      );
  }

  return json({ ok: true, notifications: rows.length, sent, subscriptions, expired });
}

export async function handlePushApi(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/push/test") return handleTest(request);
  if (url.pathname === "/api/push/birthdays") return handleBirthdays(request);
  if (url.pathname === "/api/push/finance") return handleFinance(request);
  return null;
}
