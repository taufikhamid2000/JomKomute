// Web Push service worker — registered by lib/push-notifications.ts.
// Deliberately minimal: this app has no offline/cache story, so the
// only two events handled are the ones push actually needs. Plain JS,
// not built/bundled — served as-is from /public, same as any other
// static asset.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Not JSON — fall back to the defaults below rather than dropping
    // the notification entirely.
  }

  const title = data.title || "JomKomute";
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    // Distinct notifications per line so a second alert on a different
    // line doesn't silently replace the first one still unread — same
    // line reported twice just refreshes the one notification instead
    // of stacking duplicates.
    tag: data.lineId ? `line-status-${data.lineId}` : undefined,
    data: { url: data.url || "/line-status" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/line-status";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
