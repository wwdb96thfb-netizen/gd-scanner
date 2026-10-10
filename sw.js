// GD Scanner app shell. Network first so updates arrive on the next open; cached copy when there is no signal.
// Only this folder's own files are handled. Server calls and photos are never cached here.
var CACHE = "gd-scanner-v115";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./boat.jpg", "./fonts/inter.woff2", "./fonts/barlow-600.woff2", "./fonts/barlow-700.woff2"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: "no-cache" }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf("gd-scanner-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url); if (url.origin !== self.location.origin || url.pathname.indexOf(new URL("./", self.location).pathname) !== 0) return;
  e.respondWith(fetch(req.url, { cache: "no-cache" }).then(function (res) { if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } return res; }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match("./index.html"); }); }));
});
// Alerts for admins: shown even when the app is closed.
self.addEventListener("push", function (e) { var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {} e.waitUntil(self.registration.showNotification(d.title || "GD Verification System", { body: d.body || "", icon: "./icon-192.png", badge: "./icon-192.png", tag: "gd-" + Date.now(), requireInteraction: true, data: { go: d.go || "" } })); });
self.addEventListener("notificationclick", function (e) { var go = (e.notification.data && e.notification.data.go) || ""; e.notification.close(); e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) { for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) { if (go) cs[i].postMessage({ go: go }); return cs[i].focus(); } } return self.clients.openWindow(go ? "./?go=" + encodeURIComponent(go) : "./"); })); });
