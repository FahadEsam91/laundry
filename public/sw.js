/* Nuqa service worker — Web Push + notification clicks. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { title: "Nuqa", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "Nuqa", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: d.tag,
      renotify: !!d.tag,
      dir: d.dir || "auto",
      lang: d.lang,
      vibrate: [80, 40, 80],
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          await w.focus();
          if ("navigate" in w) return w.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Browser rotated the subscription; the app re-registers on next open.
  event.waitUntil(Promise.resolve());
});
