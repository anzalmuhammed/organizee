const STATIC_CACHE = "static-v2"
const DYNAMIC_CACHE = "dynamic-v2"
const TASKS_CACHE = "tasks-data"

self.addEventListener("install", function (event) {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        "/organizee/",
        "/organizee/index.html",
        "/organizee/manifest.json",
        "/organizee/js/script.js",
        "/organizee/css/style.css",
        "/organizee/assets/images/logo.png",
        "/organizee/assets/images/moon.png",
        "/organizee/assets/images/sun.png",
        "/organizee/assets/images/delete.svg",
        "/organizee/assets/images/plus.svg",
        "/organizee/assets/images/tick-green.svg",
        "/organizee/assets/images/revert.svg",
        "/organizee/fonts/baloopaaji2-regular-webfont.woff",
        "/organizee/fonts/baloopaaji2-regular-webfont.woff2",
      ])
    })
  )
})

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList
            .map((key) => {
              if (key.startsWith("static-") && key !== STATIC_CACHE) {
                return caches.delete(key)
              }
              return null
            })
            .filter(Boolean)
        )
      })
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", function (event) {
  if (event.request.url.match(/\.(woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then(function (response) {
        return response || fetch(event.request)
      })
    )
    return
  }
  if (event.request.url.includes("/api/tasks")) {
    event.respondWith(handleTasksRequest(event))
    return
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request).then((res) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request.url, res.clone())
          return res
        })
      })
    })
  )
})

async function handleTasksRequest(event) {
  const cache = await caches.open(TASKS_CACHE)

  if (event.request.method === "GET") {
    const response = await cache.match("tasks")
    return (
      response ||
      new Response(JSON.stringify({ tasks: [], completedTasks: [] }), {
        headers: { "Content-Type": "application/json" },
      })
    )
  }

  if (event.request.method === "POST") {
    const data = await event.request.json()
    const response = new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    })
    await cache.put("tasks", response.clone())
    return response
  }

  return new Response(null, { status: 405 })
}