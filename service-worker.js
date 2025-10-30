// --- キャッシュ名の定義 ---

// 1. 静的アセット用キャッシュ
const STATIC_CACHE_NAME = 'yamabato-static-v1';

// 2. 動的タイルキャッシュ (レイヤー別)
const TILE_CACHE_GSI_STD = 'yamabato-tile-gsi-std-v1';
const TILE_CACHE_GSI_PHOTO = 'yamabato-tile-gsi-photo-v1';
const TILE_CACHE_OVERLAY_RINPAN = 'yamabato-tile-overlay-rinpan-v1';
const TILE_CACHE_OVERLAY_TISEKI = 'yamabato-tile-overlay-tiseki-v1';
const TILE_CACHE_OVERLAY_SANKOZU = 'yamabato-tile-overlay-sankozu-v1';

// ▼ 動的キャッシュ（タイル）の全リスト (activateイベントでのクリーンアップ用)
const DYNAMIC_CACHE_LIST = [
    TILE_CACHE_GSI_STD,
    TILE_CACHE_GSI_PHOTO,
    TILE_CACHE_OVERLAY_RINPAN,
    TILE_CACHE_OVERLAY_TISEKI,
    TILE_CACHE_OVERLAY_SANKOZU
];

// 3. キャッシュ設定
const MAX_TILE_CACHE_ITEMS = 1000; // 各タイルキャッシュの上限

// --- キャッシュする静的ファイルのリスト ---
const urlsToCache = [
    // アプリの基本ファイル
    './', // start_url (index.html)
    './index.html',
    './style.css',
    './main.js',
    './logic.js',
    './ui.js',
    './manifest.json',
    './やまばとスタートアイコン.png', // manifest.json で .png が指定されているため

    // 外部ライブラリ (CDN)
    // Leaflet
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    
    // Tailwind (CDN)
    'https://cdn.tailwindcss.com',
    
    // Font Awesome (CDN)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    // (webfontはfetchイベントで動的にキャッシュされる)

    // proj4js (CDN)
    'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js',

    // Leaflet Color Markers (logic.js で参照)
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png'
];

// --- ヘルパー関数: キャッシュ上限管理 ---
/**
 * 指定されたキャッシュが上限を超えていたら、古いものから削除する
 * @param {string} cacheName 対象のキャッシュ名
 * @param {number} maxItems キャッシュの上限数
 */
const trimCache = (cacheName, maxItems) => {
    caches.open(cacheName).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > maxItems) {
                // 削除対象のキー（古いものから順）
                const itemsToDelete = keys.slice(0, keys.length - maxItems);
                // 削除処理を並列実行
                Promise.all(itemsToDelete.map(key => cache.delete(key)))
                    .then(() => {
                        console.log(`Cache ${cacheName} trimmed. ${itemsToDelete.length} items deleted.`);
                    });
            }
        });
    });
};


// --- Service Worker イベントリスナー ---

// install イベント: 静的アセットをキャッシュする
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME) // 静的キャッシュを開く
            .then(cache => {
                console.log('Opened static cache');
                // CDNアセットは失敗してもインストールを続行するため、個別にキャッシュ
                const promises = urlsToCache.map(url => {
                    // no-corsリクエストはCDN（Tailwindなど）用
                    const request = new Request(url, { mode: 'no-cors' });
                    return cache.add(request).catch(err => {
                        // CORSエラーはCDNでは一般的なので警告に留める
                        if (url.startsWith('https://cdn.tailwindcss.com')) {
                             console.log(`Cached (no-cors OK): ${url}`);
                        } else {
                             console.warn(`Failed to cache: ${url}`, err);
                        }
                    });
                });
                // すべてのアセットのキャッシュ試行を待つ
                return Promise.allSettled(promises);
            })
    );
});

// fetch イベント: リクエストを横取りし、キャッシュ戦略を適用する
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    let tileCacheName = null;

    // --- 1. タイルリクエストの振り分け ---
    if (requestUrl.hostname.includes('cyberjapandata.gsi.go.jp')) {
        if (requestUrl.pathname.includes('/std/')) {
            tileCacheName = TILE_CACHE_GSI_STD;
        } else if (requestUrl.pathname.includes('/seamlessphoto/')) {
            tileCacheName = TILE_CACHE_GSI_PHOTO;
        }
    } else if (requestUrl.hostname.includes('rinpan-f93d64.netlify.app')) {
        tileCacheName = TILE_CACHE_OVERLAY_RINPAN;
    } else if (requestUrl.hostname.includes('yamabato-tiseki-saijo-4d9a42.netlify.app')) {
        tileCacheName = TILE_CACHE_OVERLAY_TISEKI;
    } else if (requestUrl.hostname.includes('snkozu-72971b.netlify.app')) {
        tileCacheName = TILE_CACHE_OVERLAY_SANKOZU;
    }

    // --- 1-B. タイルキャッシュ処理 (Cache First, then Network, with cache trimming) ---
    if (tileCacheName) {
        event.respondWith(
            caches.open(tileCacheName).then(cache => {
                return cache.match(event.request).then(response => {
                    // キャッシュにあればそれを返す
                    if (response) {
                        return response;
                    }
                    
                    // なければネットワークから取得
                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse) {
                            const responseToCache = networkResponse.clone();
                            // キャッシュに保存し、その後（非同期で）上限チェック
                            cache.put(event.request, responseToCache).then(() => {
                                // 応答をブロックしないよう、キャッシュ削除は非同期で実行
                                trimCache(tileCacheName, MAX_TILE_CACHE_ITEMS);
                            });
                        }
                        return networkResponse;
                    }).catch(error => {
                        console.warn('Tile fetch failed:', event.request.url, error);
                        // オフラインなどで取得失敗した場合
                    });
                });
            })
        );
    } 
    // --- 2. 外部API (Geminiなど) - キャッシュしない (Network Only) ---
    else if (requestUrl.hostname.includes('googleapis.com')) {
        event.respondWith(fetch(event.request));
    } 
    // --- 3. その他のリクエスト (静的アセット、CDNライブラリ) (Cache First) ---
    else {
        event.respondWith(
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    // キャッシュがあればそれを返す
                    if (response) {
                        return response;
                    }
                    
                    // なければネットワークから取得
                    return fetch(event.request).then(
                        networkResponse => {
                            // (ネットワークが利用可能な場合)
                            // 有効なレスポンスのみキャッシュする
                            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0) || networkResponse.type === 'error') {
                                return networkResponse;
                            }
                            
                            // レスポンスをクローンして静的キャッシュに保存
                            const responseToCache = networkResponse.clone();
                            cache.put(event.request, responseToCache);
                            
                            return networkResponse;
                        }
                    ).catch(error => {
                        console.warn('Static asset fetch failed:', event.request.url, error);
                    });
                });
            })
        );
    }
});

// activate イベント: 古いキャッシュを削除する
self.addEventListener('activate', event => {
    // 新しいキャッシュ名（ホワイトリスト）
    // 静的キャッシュ + 動的タイルキャッシュの全リスト
    const cacheWhitelist = [STATIC_CACHE_NAME, ...DYNAMIC_CACHE_LIST];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // ホワイトリストに含まれないキャッシュ（古いキャッシュ）は削除
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// ▼▼ message イベントリスナーを追加 (キャッシュ削除用) ▼▼
self.addEventListener('message', event => {
    // action が 'clearCache' のメッセージか確認
    if (event.data && event.data.action === 'clearCache') {
        console.log('Received clearCache message. Deleting all tile caches...');
        
        // DYNAMIC_CACHE_LIST に含まれるすべてのタイルキャッシュを削除
        event.waitUntil(
            Promise.all(
                // DYNAMIC_CACHE_LIST をイテレートして caches.delete() を実行
                DYNAMIC_CACHE_LIST.map(cacheName => {
                    return caches.delete(cacheName).then(deleted => {
                        console.log(`Cache ${cacheName} deleted: ${deleted}`);
                        return deleted;
                    });
                })
            ).then(() => {
                console.log('All tile caches have been deleted.');
                // オプション: 削除完了をクライアントに通知する場合
                // self.clients.matchAll().then(clients => {
                //     clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
                // });
            })
        );
    }
});

