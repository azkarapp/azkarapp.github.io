// v0.0.5 - GitHub Pages under /Saber/ (Production Ready - Final)
const VERSION = 'v0.0.4';
const SCOPE = '/Saber/';
const CACHE_NAME = `sabry-sadaqa-${VERSION}`;

// استخدم مسارات مطلقة داخل الـ scope لتفادي مشاكل المسارات النسبية (./) وإعادة التوجيه
const ASSETS = [
  SCOPE,
  `${SCOPE}index.html`,
  `${SCOPE}css/main.css`,
  `${SCOPE}css/themes.css`,
  `${SCOPE}js/core.js`,
  `${SCOPE}js/ui.js`,
  `${SCOPE}js/pwa.js`,
  `${SCOPE}data/azkar.js`,
  `${SCOPE}data/duas.js`,
  `${SCOPE}data/tasks.js`,
  `${SCOPE}data/names.js`,
  `${SCOPE}data/stories.js`,
  `${SCOPE}manifest.json`,
  `${SCOPE}icons/icon-192x192.png`,
  `${SCOPE}icons/icon-512x512.png`,
  `${SCOPE}icons/Preview.png` // صورة Open Graph
];

// تثبيت: كاش للأصول الأساسية (مع تحمل الأخطاء عبر allSettled بدلاً من addAll)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.allSettled(
      ASSETS.map((url) => cache.add(url))
    );

    await self.skipWaiting();
  })());
});

// التفعيل: تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
    );
    await self.clients.claim();
  })());
});

// Helpers للتحقق من النطاق
function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isInScope(pathname) {
  return pathname.startsWith(SCOPE);
}

// توحيد مفتاح تخزين الـ HTML لتجنب تضخم الكاش مع الروابط المخصصة
function getHtmlCacheKey() {
  return new Request(`${SCOPE}index.html`);
}

// استراتيجية الجلب (Fetch Strategy)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // التعامل فقط مع طلبات GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // تجاهل أي طلب خارج الدومين أو خارج نطاق التطبيق (مثل أدسنس/خطوط جوجل) لمنع CORS ومشاكل غير متوقعة
  if (!isSameOrigin(url) || !isInScope(url.pathname)) return;

  // HTML: Network-first لضمان وصول التحديثات سريعاً
  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html') || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isHTML) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const htmlKey = getHtmlCacheKey();

      try {
        const fresh = await fetch(req, { cache: 'no-store' });

        // نخزن نسخة واحدة من index.html فقط بغض النظر عن query parameters
        cache.put(htmlKey, fresh.clone());

        return fresh;
      } catch {
        // Offline fallback
        return (await cache.match(htmlKey)) || caches.match(`${SCOPE}index.html`);
      }
    })());
    return;
  }

  // Static assets: Cache-first مع تحمل فشل الشبكة
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      // لو الملف مش موجود في الكاش وانقطع النت، نرجع fallback لطيف
      return caches.match(`${SCOPE}index.html`);
    }
  })());
});

// الاستماع لرسالة التحديث الفوري من الواجهة
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
