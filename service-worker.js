const CACHE_NAME = 'yamabato-cache-v1';
// キャッシュするファイルのリスト。README.mdによると style.css, logic.js, ui.js が存在するため追加します。
const urlsToCache = [
  './', // ルートパスもキャッシュ（'/' でも可）
  './index.html',
  './style.css',
  './main.js',
  './logic.js',
  './ui.js',
  './manifest.json',
  './やまばとスタートアイコン.png',
  // ライブラリのCDNリンクもキャッシュ対象に追加（オフライン動作の安定化のため）
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// install イベント: キャッシュをインストールする
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // addAllはアトミック操作。一つでも失敗すると全体が失敗する。
        // CDNリソースのキャッシュに失敗する可能性がある場合、個別にaddリクエストを送信し、失敗を許容する戦略も考えられますが、
        // まずはaddAllで試みます。
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache resources during install:', error);
          // 必須でないリソースで失敗した場合でも、インストールを続行させる場合は
          // ここでPromise.resolve()を返すことも可能ですが、一旦失敗させます。
        });
      })
  );
});

// fetch イベント: リクエストを傍受し、キャッシュから返す
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュに存在すればそれを返す
        if (response) {
          return response;
        }
        // キャッシュになければネットワークから取得する
        return fetch(event.request).catch(error => {
          // ネットワークエラー（オフラインなど）
          console.log('Fetch failed; returning offline page instead.', error);
          // ここでオフライン用の代替ページを返すことも可能
        });
      })
  );
});

// activate イベント: 古いキャッシュを削除する（今回はv1なのでシンプルに）
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
