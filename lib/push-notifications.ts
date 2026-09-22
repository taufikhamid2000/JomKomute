"use client";

// Client side of Web Push: registers public/sw.js, subscribes/
// unsubscribes via the browser's PushManager, and keeps
// app/api/push/* in sync with which lines a subscription cares about.
// The "am I subscribed" state itself is read straight from the
// browser's own PushSubscription (registration.pushManager.
// getSubscription()) rather than duplicated into localStorage — it's
// already the source of truth and can't silently drift out of sync
// with it the way a separate flag could (e.g. if the permission gets
// revoked from browser settings).

const SW_PATH = "/sw.js";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// PushManager.subscribe()'s applicationServerKey wants a plain
// ArrayBuffer-backed view — Uint8Array's own type in this TS/lib
// config allows a SharedArrayBuffer backing too, which that DOM API
// doesn't, hence the explicit ArrayBuffer() copy below.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64Safe);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration(SW_PATH)) ?? (await navigator.serviceWorker.register(SW_PATH));
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

function subscriptionPayload(subscription: PushSubscription, lineIds: string[]) {
  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!key || !auth) throw new Error("Push subscription is missing encryption keys.");
  return {
    endpoint: subscription.endpoint,
    p256dh: window.btoa(String.fromCharCode(...new Uint8Array(key))),
    auth: window.btoa(String.fromCharCode(...new Uint8Array(auth))),
    lineIds,
  };
}

// Requests notification permission (if not already granted/denied),
// registers the service worker, subscribes via PushManager, and tells
// app/api/push/subscribe which lines to alert on. Throws if permission
// is denied or push isn't supported — callers show that as an error,
// same as any other action in this app.
export async function subscribeToPush(lineIds: string[]): Promise<void> {
  if (!isPushSupported()) throw new Error("Push notifications aren't supported in this browser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was denied.");

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Push notifications aren't configured on this deployment yet.");

  const registration = await getRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscriptionPayload(subscription, lineIds)),
  });
  if (!res.ok) throw new Error("Couldn't save your notification subscription. Try again.");
}

// Called whenever the followed-lines set changes while already
// subscribed — re-sends the same subscription with the new line list,
// no new permission prompt needed. A no-op (not an error) if there's
// no active subscription yet, since that's the normal state for anyone
// who hasn't turned notifications on.
export async function syncPushLineIds(lineIds: string[]): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscriptionPayload(subscription, lineIds)),
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}
