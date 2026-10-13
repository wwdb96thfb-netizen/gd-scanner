// GD Scanner app shell. Opens from the copy saved on the phone; updates are fetched in the background and applied by the app.
// This folder's own files are handled, and photos of files are kept on the phone. Other server calls are never cached here.
var PICS = "gd-pics-v1";
var CACHE = "gd-scanner-v144";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./boat.jpg", "./fonts/inter.woff2", "./fonts/barlow-600.woff2", "./fonts/barlow-700.woff2"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: "no-cache" }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf("gd-scanner-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url), pm = url.pathname.match(/\/api\/(thumb|photo)\/([^\/]+)\/(\d+)$/);
  // Photos of a file never change, so a copy is kept on the phone the first time one is seen. It is then shown even when the server cannot be reached.
  if (pm) { var key = self.location.origin + "/__pic/" + pm[1] + "/" + pm[2] + "/" + pm[3]; e.respondWith(caches.open(PICS).then(function (c) { return c.match(key).then(function (hit) { if (hit) return hit; return fetch(req.url, { mode: "cors" }).then(function (res) { if (res && res.ok) { c.put(key, res.clone()); c.keys().then(function (ks) { if (ks.length > 700) ks.slice(0, ks.length - 600).forEach(function (k) { c.delete(k); }); }); } return res; }); }); }).catch(function () { return new Response("", { status: 504 }); })); return; }
  var url = new URL(req.url); if (url.origin !== self.location.origin || url.pathname.indexOf(new URL("./", self.location).pathname) !== 0) return;
  // The app opens from the copy saved on the phone, at once, with or without signal. The page itself is re-fetched quietly in the background;
  // the app notices a newer version and switches to it at a quiet moment. Pictures and fonts are fetched only once.
  // Requests marked _= (the app's own update check) always go to the network.
  var key = new Request(url.origin + url.pathname), page = /\/$|\.html$|\.json$/.test(url.pathname);
  var get = function () { return fetch(req.url, { cache: "no-cache" }).then(function (res) { if (res && res.ok && url.search.indexOf("_=") < 0) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); } return res; }); };
  if (url.search.indexOf("_=") >= 0) { e.respondWith(get().catch(function () { return new Response("", { status: 504 }); })); return; }
  var saved = caches.match(key).then(function (hit) { return hit || (/\/$/.test(url.pathname) ? caches.match(url.origin + url.pathname + "index.html") : null); });
  var net = page ? get() : null; if (net) e.waitUntil(net.catch(function () {}));
  e.respondWith(saved.then(function (hit) { return hit || net || get(); })
    .catch(function () { return caches.match("./index.html").then(function (h) { return h || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } }); }); }));
});
// Alerts for admins: shown even when the app is closed.
self.addEventListener("push", function (e) { var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {} e.waitUntil(self.registration.showNotification(d.title || "GD Verification System", { body: d.body || "", icon: "./icon-192.png", badge: "./icon-192.png", tag: "gd-" + Date.now(), requireInteraction: true, data: { go: d.go || "" } })); });
self.addEventListener("notificationclick", function (e) { var go = (e.notification.data && e.notification.data.go) || ""; e.notification.close(); e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) { for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) { if (go) cs[i].postMessage({ go: go }); return cs[i].focus(); } } return self.clients.openWindow(go ? "./?go=" + encodeURIComponent(go) : "./"); })); });
