const CACHE_NAME = 'yamabato-cache-v1';
const MAX_TILES_TO_CACHE = 500; // ▼▼▼ 追加: タイルの最大キャッシュ件数 ▼▼▼

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

// ▼▼▼ 修正箇所: tileHostnames をグローバルスコープに移動 ▼▼▼
// main.jsで定義されているタイルレイヤーのホスト名
const tileHostnames = [
  'cyberjapandata.gsi.go.jp',
  'rinpan-f93d64.netlify.app',
  'yamabato-tiseki-saijo-4d9a42.netlify.app',
  'snkozu-72971b.netlify.app'
];
// ▲▲▲ 修正箇所 ここまで ▲▲▲

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

// ▼▼▼ 追加: キャッシュ上限管理関数 ▼▼▼
/**
 * キャッシュストレージ内のタイル数を制限する
 * @param {Cache} cache - 対象のキャッシュオブジェクト
 * @param {string[]} hostnames - タイルホスト名の配列
 * @param {number} maxItems - 最大キャッシュ件数
 */
function trimCache(cache, hostnames, maxItems) {
  cache.keys().then(keys => {
    // 1. タイルリクエストのみをフィルタリング
    const tileKeys = keys.filter(key => {
      // key.url が存在することを確認（keyはRequestオブジェクト）
      if (!key || !key.url) return false;
      try {
        const url = new URL(key.url);
        return hostnames.includes(url.hostname);
      } catch (e) {
        // URLパース失敗（不正なリクエスト）は除外
        return false;
      }
    });

    // 2. 上限を超えているか確認
    if (tileKeys.length > maxItems) {
      // 3. 古いものから削除（FIFO: keys()が返す順序に依存）
      const keysToDelete = tileKeys.slice(0, tileKeys.length - maxItems);
      console.log(`Cache limit exceeded. Deleting ${keysToDelete.length} old tiles.`);
      // 削除処理をPromise.allで並列実行
      return Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  }).catch(error => {
    console.error('Error trimming cache:', error);
  });
}
// ▲▲▲ 追加 ここまで ▲▲▲

// fetch イベント: リクエストを傍受し、キャッシュ戦略を適用する
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ▼▼▼ 修正箇所: タイルキャッシュ処理（上限管理呼び出し追加） ▼▼▼
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
            const isValidResponse = (networkResponse && 
                                   (networkResponse.status === 200 && networkResponse.type === 'basic') || 
                                   (networkResponse.status === 0)); // no-cors

            if (isValidResponse) {
              const responseToCache = networkResponse.clone();
              // cache.put は Promise を返す
              cache.put(event.request, responseToCache).then(() => {
                // キャッシュ保存が成功したら、非同期で上限管理を実行
                trimCache(cache, tileHostnames, MAX_TILES_TO_CACHE);
              });
            }
            
            // 4. ネットワークレスポンスを返す
            return networkResponse;

          }).catch(error => {
            console.error('Fetching tile failed:', error);
            // オフライン時にタイル取得に失敗した場合、ここでエラーを投げると
            // 画面全体がクラッシュする可能性があるため、空のレスポンスや
            // プレースホルダー画像を返すことも検討できますが、
            // Leaflet側である程度ハンドリングされることを期待し、エラーをスローします。
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

