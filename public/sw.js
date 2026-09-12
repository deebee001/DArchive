const streams = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REGISTER_STREAM') {
    const { id, stream, filename, size } = event.data;
    streams.set(id, { stream, filename, size });
    event.ports[0]?.postMessage({ success: true });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/download/')) {
    const id = url.pathname.split('/')[2]; // /download/ID/filename.zip
    if (streams.has(id)) {
      const { stream, filename, size } = streams.get(id);
      streams.delete(id); // Only allow one download per registration
      
      const headers = new Headers({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      });
      
      if (size) {
        headers.set('Content-Length', size.toString());
      }
      
      event.respondWith(new Response(stream, { headers }));
    } else {
      event.respondWith(new Response('Stream not found or expired.', { status: 404 }));
    }
  }
});
