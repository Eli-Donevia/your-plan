const C = "your-plan-ffec3329c5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = res => { if (!done && res) { done = true; resolve(res); } };
      const saved = () => caches.match(r, {ignoreSearch: true}).then(m => m || (r.mode === "navigate" ? caches.match("./index.html") : undefined));
      const t = setTimeout(() => saved().then(finish), 3000);
      fetch(r).then(res => {
        clearTimeout(t);
        if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); }
        finish(res);
      }).catch(() => { clearTimeout(t); saved().then(m => finish(m || Response.error())); });
    }));
  } else if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); return res; })));
  }
});
/* lock-screen notifications from push-worker */
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch(_) { d = {body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "Your Plan", {body: d.body || "", tag: d.tag || "yourplan", icon: "icon-192.png", badge: "icon-192.png", data: {url: d.url || "./"}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({type: "window", includeUncontrolled: true}).then(async cs => {
    for (const c of cs){ if ("focus" in c){ if (c.url !== target && "navigate" in c) { try { await c.navigate(target); } catch(_) {} } return c.focus(); } }
    return clients.openWindow(target);
  }));
});
