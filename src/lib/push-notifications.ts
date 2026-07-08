import { supabase } from "./supabase";

export type PushSetupResult =
  | "enabled"
  | "saved"
  | "local-only"
  | "denied"
  | "unsupported"
  | "missing-key"
  | "save-failed";

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function canUseServiceWorker() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function canUsePush() {
  return canUseServiceWorker() && "PushManager" in window;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function getNotificationPermission() {
  if (!canUseNotifications()) return "unsupported" as const;
  return Notification.permission;
}

export async function requestNativeNotificationPermission() {
  if (!canUseNotifications()) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
}

export async function showNativeNotification(
  title: string,
  options: NotificationOptions = {},
) {
  if (!canUseNotifications() || Notification.permission !== "granted") return false;

  const payload: NotificationOptions = {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    ...options,
  };

  if (canUseServiceWorker()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, payload);
      return true;
    } catch {
      // Fall through to the browser Notification constructor.
    }
  }

  new Notification(title, payload);
  return true;
}

export async function registerPushDevice(profileId: string): Promise<PushSetupResult> {
  const permission = await requestNativeNotificationPermission();
  if (permission === "unsupported") return "unsupported";
  if (permission !== "granted") return "denied";
  if (!canUsePush()) return "local-only";

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) return "missing-key";

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));
    const json = subscription.toJSON();
    const keys = json.keys ?? {};

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        profile_id: profileId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh ?? "",
        auth: keys.auth ?? "",
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,endpoint" },
    );

    if (error) return "save-failed";
    await sendPushTest();
    return existing ? "enabled" : "saved";
  } catch {
    return "save-failed";
  }
}

export async function sendPushTest() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const response = await fetch("/api/push/test", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  return response.ok;
}

export async function sendFinancePush() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const response = await fetch("/api/push/finance", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  return response.ok;
}
