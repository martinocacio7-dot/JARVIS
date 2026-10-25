// Aplicación privada: no guardar páginas, archivos ni respuestas API en caché.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => {
    if (event.request.mode === 'navigate') return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JARVIS · Sin conexión</title><body><h1>Sin conexión</h1><p>Conéctate a Internet y vuelve a abrir JARVIS. La pantalla privada no está disponible sin conexión.</p><a href="/">Volver a intentar</a></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'" } });
    return new Response(JSON.stringify({ error: 'Sin conexión. Revisa la red antes de volver a enviar; no se reintentan acciones automáticamente.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }));
});
