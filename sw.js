/**
 * ====================================================================
 * Service Worker
 * ====================================================================
 * مسؤول عن:
 * - تخزين App Shell الأساسي
 * - دعم التشغيل بدون إنترنت
 * - تحسين سرعة تحميل الصفحات والملفات الثابتة
 * - تحديث الكاش تلقائياً مع كل إصدار جديد
 */

const CACHE_VERSION = 'azkar-v11';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = [
    // 1. ملفات الجذر (Root)
    './',
    './index.html',
    './about.html',
    './contact.html',
    './privacy.html',
    './terms.html',
    './robots.txt',
    './sitemap.xml',
    './manifest.json',

    // 2. ملفات التنسيق (CSS)
    './css/main.css',
    './css/modules.css',
    './css/themes.css',

    // 3. ملفات الجافاسكريبت الأساسية (JS)
    './js/app.js',
    './js/config.js',
    './js/dom.js',
    './js/storage.js',
    './js/ui-state.js',
    './js/content.js',
    './js/notifications.js',
    './js/pwa.js',
    './js/render-scheduler.js',
    './js/masbaha.js',
    './js/quran.js',
    './js/rewards.js',
    './js/achievements.js',
    './js/ads.js',
    './js/ads-config.js',
    './js/firebase-core.js',
    './js/tasks.js',

    // 4. ملفات جافاسكريبت المهام (JS/Tasks)
    './js/tasks/tasks-core.js',
    './js/tasks/tasks-ui.js',
    './js/tasks/tasks-motivation.js',
    './js/tasks/tasks-stats.js',

    // 5. ملفات البيانات (Data)
    './data/quranData.js',
    './data/names.js',
    './data/azkar.js',
    './data/messages.js',
    './data/ayahs.json',
    './data/stories.js',
    './data/duasData.js',

    // 6. ملفات الوسائط (Assets)
    './assets/images/avatar.png',
    './assets/audio/tasbeeh-click.mp3',

    // 7. الأيقونات (Icons)
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then(cache => cache.addAll(APP_SHELL_URLS))
            .catch(error => {
                console.error('[SW] install cache addAll failed:', error);
            })
    );
});

self.addEventListener('activate', event => {
    const currentCaches = [APP_SHELL_CACHE, RUNTIME_CACHE];

    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(cacheName => !currentCaches.includes(cacheName))
                .map(cacheName => caches.delete(cacheName))
        );
        await self.clients.claim();
    })());
});

function isCacheableResponse(response) {
    return !!response && response.status === 200 && (response.type === 'basic' || response.type === 'cors');
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    const response = await fetch(request);
    if (isCacheableResponse(response)) {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
    }
    return response;
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const networkPromise = fetch(request)
        .then(response => {
            if (isCacheableResponse(response)) {
                const copy = response.clone();
                caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        return cached;
    }

    const networkResponse = await networkPromise;
    if (networkResponse) {
        return networkResponse;
    }

    if (request.destination === 'document') {
        return caches.match('./index.html');
    }

    return new Response('', {
        status: 404,
        statusText: 'Not Found'
    });
}

async function networkFirstForDocuments(request) {
    try {
        const response = await fetch(request);
        if (isCacheableResponse(response)) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        return caches.match('./index.html');
    }
}

self.addEventListener('fetch', event => {
    const request = event.request;

    if (request.method !== 'GET') return;
    if (!request.url.startsWith(self.location.origin)) return;

    const url = new URL(request.url);

    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(networkFirstForDocuments(request));
        return;
    }

    const isStaticAsset = [
        'style',
        'script',
        'worker',
        'image',
        'font',
        'audio'
    ].includes(request.destination);

    const isDataFile = url.pathname.endsWith('.json') || url.pathname.endsWith('.js');

    if (isStaticAsset || isDataFile) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    event.respondWith(cacheFirst(request));
});

self.addEventListener('message', event => {
    if (!event.data) return;

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || './index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
