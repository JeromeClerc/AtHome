/*
 * Service worker des notifications push At Home (Firebase Cloud Messaging).
 *
 * La Cloud Function `onNotificationCreated` envoie des messages FCM « data » contenant
 * { title, body, link, tag }. Ce service worker les affiche et ouvre la bonne page au clic.
 * Il n'a pas besoin de la configuration Firebase : FCM délivre les messages via le Push API standard.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { data: { title: 'At Home', body: event.data ? event.data.text() : '' } }
  }
  const data = payload.data || {}
  const notification = payload.notification || {}
  const title = data.title || notification.title || 'At Home'
  const options = {
    body: data.body || notification.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { link: data.link || '/' },
    lang: 'fr-CH',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  const target = new URL(link, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
