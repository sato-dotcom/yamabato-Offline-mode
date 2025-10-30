const CACHE_NAME = 'yamabato-cache-v1';
// キャッシュするファイルのリスト（前回定義したもの）
const urlsToCache = [
  './', // ルートパスもキャッシュ（'/' でも可）
  './index.html',
  './style.css',
  './main.js',
  './logic.js',
  './ui.js',
  './manifest.json',
  './やまばとスタートアイコン.png',
  // ライブラリのCDNリンク
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// install イベント: 静的ファイルをキャッシュする
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache resources during install:', error);
        });
      })
  );
});

// fetch イベント: リクエストを傍受し、キャッシュ戦略を適用する
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // main.jsで定義されているタイルレイヤーのホスト名
  const tileHostnames = [
    'cyberjapandata.gsi.go.jp',
    'rinpan-f93d64.netlify.app',
    'yamabato-tiseki-saijo-4d9a42.netlify.app',
    'snkozu-72971b.netlify.app'
  ];

  // ▼▼▼ 修正箇所: タイルキャッシュ処理 ▼▼▼
  // リクエストURLのホスト名がタイルホストリストに含まれているか確認
  if (tileHostnames.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          // 1. キャッシュに存在すれば、それを返す
          if (response) {
            return response;
          }
          
          // 2. キャッシュになければ、ネットワークから取得
          return fetch(event.request).then(networkResponse => {
            // 3. 取得したレスポンスをキャッシュに保存
            //    (ネットワークエラー時や不透明なレスポンス(opaque)はキャッシュしないようチェック)
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            } else if (networkResponse && networkResponse.status === 0) {
              // no-corsモードでのリクエスト（netlifyタイルなど）
              cache.put(event.request, networkResponse.clone());
            }
            // 4. ネットワークレスポンスを返す
            return networkResponse;
          }).catch(error => {
            console.error('Fetching tile failed:', error);
            throw error;
          });
        });
      })
    );
    return; // タイル処理はここで終了
  }
  // ▲▲▲ 修正箇所 ここまで ▲▲▲

  // ▼▼▼ 既存の処理: 静的ファイル（App Shell）のキャッシュ戦略 ▼▼▼
  // キャッシュファースト戦略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュに存在すればそれを返す
        if (response) {
          return response;
        }
        // キャッシュになければネットワークから取得する
        return fetch(event.request).catch(error => {
          console.log('Fetch failed for non-tile resource:', event.request.url, error);
        });
      })
  );
});

// activate イベント: 古いキャッシュを削除する
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

