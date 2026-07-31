// Service Worker for 小星球的数学奶茶屋 (v8)
const CACHE_NAME = 'mathmilktea-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 立即激活，让用户拿到新代码
});

self.addEventListener('activate', (e) => {
  // 删除所有旧缓存，强制重新拉取资源
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // 立即接管当前所有页面，让新代码立即生效
});

// 策略：网络优先，失败再用缓存。确保每次打开都拿到最新代码。
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 不缓存 API 调用
  if (url.hostname.includes('github.com') || url.hostname.includes('gist') || url.pathname.startsWith('/api/')) {
    return;
  }

  // 同源请求：网络优先，失败回退缓存，确保拿到最新代码
  if (url.origin === self.location.origin && (e.request.method === 'GET')) {
    e.respondWith(
      fetch(e.request).then((response) => {
        // 成功：写缓存（克隆响应避免 body 被消费）
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // 网络失败：用缓存兜底
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          return caches.match('./index.html');
        });
      })
    );
  }
});

// 更新完成后通知客户端刷新
self.addEventListener('message', (e) => {
  if (e.data && e.data === 'SKIP_WAITING') self.skipWaiting();
});
