// Service Worker Web Push — BUG (Bulungan untuk Goweser)

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "SOS Darurat";
  const options = {
    body: data.body || "Ada pengguna membutuhkan bantuan.",
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag || "sos-alert",
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: data.url || "/",
      payload: data.payload || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const payload = (event.notification.data && event.notification.data.payload) || null;

  let openUrl = "/";
  if (payload) {
    const params = new URLSearchParams();
    params.set("sosAlert", "1");
    if (payload.id) params.set("id", String(payload.id));
    if (payload.author_name) params.set("name", String(payload.author_name));
    if (payload.lat != null) params.set("lat", String(payload.lat));
    if (payload.lng != null) params.set("lng", String(payload.lng));
    openUrl = "/?" + params.toString();
  }

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({ type: "sos-notification-click", payload });
          return;
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(openUrl);
      }
    })()
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch handler minimal — syarat agar PWA bisa di-install
self.addEventListener("fetch", () => {});
