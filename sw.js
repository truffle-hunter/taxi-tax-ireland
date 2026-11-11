/* Offline support for the installed guide. build.py fills in the version and the precache list. */
const CACHE = "ttg-dd0f21346003";
const PRECACHE = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Stale-while-revalidate: open instantly from the cache, refresh it from the network for next time.
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match("./");
      // Always refresh the app page itself ("./"), never the URL as typed: hosts with "pretty URLs" redirect
      // /index.html to /, and a redirected response cannot answer a navigation, which would break every later launch.
      const fresh = fetch(new Request("./", { cache: "no-cache" })).then((response) => {
        if (response.ok && !response.redirected) cache.put("./", response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(fresh.catch(() => undefined));
        return cached;
      }
      return fresh;
    }));
    return;
  }

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
