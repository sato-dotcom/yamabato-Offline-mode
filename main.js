<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <!-- スマートフォンでの表示を最適化 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>やまばと (山岳版測量支援アプリ)</title>

    <!-- ▼▼ アイコンとWebアプリ設定を修正 ▼▼ -->
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="やまばと">
    <!-- Appleデバイス用アイコン -->
    <link rel="apple-touch-icon" href="やまばとスタートアイコン.png">
    <!-- 標準的なブラウザ用アイコン -->
    <link rel="icon" type="image/png" href="やまばとスタートアイコン.png">
    <!-- ▲▲ ここまで修正 ▲▲ -->

    <!-- ライブラリの読み込み -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js"></script>
    
    <!-- カスタムCSSの読み込み -->
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-200 font-sans">

    <!-- アプリ全体のコンテナ -->
    <div class="w-full h-full flex flex-col">

        <!-- メインコンテンツ (地図とコントロールパネル) -->
        <main>
            <!-- 地図表示エリア -->
            <div id="map"></div>
            
            <!-- 全画面表示用の情報パネル -->
            <div id="fullscreen-info-panel">
                <div class="font-mono text-xs">
                    <p>緯度: <span id="fullscreen-lat">---</span></p>
                    <p>経度: <span id="fullscreen-lon">---</span></p>
                    <p>精度: <span id="fullscreen-acc">---</span> m</p>
                    <p>ステータス: <span id="fullscreen-gnss-status">---</span></p>
                </div>
                <div id="fullscreen-nav-info" class="font-mono text-xs mt-2 border-t pt-2 hidden">
                    <p>目標距離: <span id="fullscreen-distance">--</span> m</p>
                    <p>目標方角: <span id="fullscreen-bearing-text">--</span></p>
                </div>
            </div>

            <!-- 下部コントロールパネル -->
            <div id="controls-panel" class="bg-white rounded-t-2xl shadow-2xl p-4 custom-scrollbar overflow-y-auto">
                
                <!-- モード切替タブ -->
                <div class="mb-3 flex justify-around border-b">
                    <button id="mode-acquire-tab" class="w-full py-2 text-base font-semibold text-blue-600 border-b-2 border-blue-600">座標取得</button>
                    <button id="mode-navigate-tab" class="w-full py-2 text-base font-semibold text-gray-500">座標誘導</button>
                </div>

                <!-- 共通：現在地情報 -->
                <div class="mb-3 p-2 bg-gray-100 rounded-lg">
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-gray-700 text-sm">現在地情報</h3>
                        <div id="gps-status" class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-mono text-xs">測位中...</div>
                    </div>
                    <div class="font-mono text-xs grid grid-cols-2 gap-x-2 mt-2">
                        <p>緯度: <span id="current-lat">---</span></p>
                        <p>経度: <span id="current-lon">---</span></p>
                        <p>X座標: <span id="current-x">---</span></p>
                        <p>Y座標: <span id="current-y">---</span></p>
                    </div>
                    <div class="mt-2">
                        <select id="current-coord-system-select" class="w-full p-1 border rounded text-xs"></select>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <p class="font-mono text-xs">精度: <span id="current-acc">---</span> m</p>
                        <p class="font-mono text-xs">ステータス: <span id="gnss-status">---</span></p>
                    </div>
                </div>

                <!-- 座標取得モード用パネル -->
                <div id="panel-acquire">
                    <h2 class="text-lg font-semibold text-gray-800 mb-2">ポイント記録</h2>
                    <button id="record-point-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-md mb-3">
                        <i class="fas fa-map-marker-alt mr-2"></i>現在地を記録
                    </button>
                    <div id="point-list" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border p-2 rounded-lg bg-gray-50">
                        <p class="text-gray-500 text-sm">まだ記録はありません。</p>
                    </div>
                    <!-- 座標系選択を追加 -->
                    <div class="mt-3">
                        <label for="export-coord-system-select" class="block text-sm font-medium text-gray-700">エクスポート座標系</label>
                        <select id="export-coord-system-select" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            <!-- オプションはJavaScriptで動的に生成 -->
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <button id="export-csv-btn" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300" disabled>
                            <i class="fas fa-download mr-2"></i>CSV出力
                        </button>
                        <button id="generate-report-btn" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300" disabled>
                            ✨ 日報生成
                        </button>
                    </div>
                    <button id="delete-all-btn" class="w-full mt-3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300" disabled>
                        <i class="fas fa-trash-alt mr-2"></i>全データ削除
                    </button>
                </div>

                <!-- 座標誘導モード用パネル -->
                <div id="panel-navigate" class="hidden">
                    <div class="border-b pb-3 mb-3">
                        <h2 class="text-lg font-semibold text-gray-800 mb-2">CSVインポート (目標点)</h2>
                        <div class="mt-1">
                            <label for="import-coord-system-select" class="block text-sm font-medium text-gray-700">読込ファイルの座標系</label>
                            <select id="import-coord-system-select" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"></select>
                        </div>
                        <button id="import-csv-btn" class="w-full mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                            <i class="fas fa-file-import mr-2"></i>ファイルを選択
                        </button>
                        <input type="file" id="csv-file-input" class="hidden" accept=".csv">
                        <p class="text-xs text-gray-500 mt-1">形式: 測点名,Y座標,X座標</p>
                        <div id="imported-point-list" class="mt-2 space-y-2 max-h-24 overflow-y-auto custom-scrollbar border p-2 rounded-lg bg-gray-50">
                            <p class="text-gray-500 text-sm">ファイルが読み込まれていません。</p>
                        </div>
                    </div>
                    
                    <h2 class="text-lg font-semibold text-gray-800 mb-2">手動入力</h2>
                    <div class="flex border-b mb-2">
                        <button id="manual-input-latlon-tab" class="px-4 py-1 text-sm font-semibold text-white bg-purple-500 rounded-t-md border-b-2 border-transparent">緯度経度</button>
                        <button id="manual-input-xy-tab" class="px-4 py-1 text-sm font-semibold text-gray-600 bg-gray-200 rounded-t-md">XY座標</button>
                    </div>

                    <div id="manual-input-latlon-panel">
                        <div class="space-y-2 mb-2">
                            <input type="number" step="any" id="target-lat-input" placeholder="目標の緯度" class="w-full p-2 border rounded text-sm">
                            <input type="number" step="any" id="target-lon-input" placeholder="目標の経度" class="w-full p-2 border rounded text-sm">
                        </div>
                    </div>

                    <div id="manual-input-xy-panel" class="hidden">
                        <div class="space-y-2 mb-2">
                            <select id="manual-xy-coord-system-select" class="w-full p-2 border rounded text-sm"></select>
                            <input type="number" step="any" id="target-y-input" placeholder="Y座標 (CADのX)" class="w-full p-2 border rounded text-sm">
                            <input type="number" step="any" id="target-x-input" placeholder="X座標 (CADのY)" class="w-full p-2 border rounded text-sm">
                        </div>
                    </div>

                    <button id="set-target-btn" class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-md">
                        <i class="fas fa-crosshairs mr-2"></i>目標を設定
                    </button>

                    <div id="navigation-info" class="mt-3 p-3 bg-indigo-50 rounded-lg text-center hidden">
                        <p class="text-base font-semibold text-gray-700">目標までの距離と方角</p>
                        <p id="distance-to-target" class="text-3xl font-bold text-indigo-600 my-1">-- m</p>
                        <div class="flex justify-center items-center">
                             <i id="bearing-arrow" class="fas fa-arrow-up text-2xl text-indigo-600 transition-transform duration-500"></i>
                             <span id="bearing-text" class="ml-3 text-xl font-semibold text-indigo-600">--</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-2 text-sm border-t pt-2">
                            <p id="north-south-info">--</p>
                            <p id="east-west-info">--</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- ポイント名入力モーダル -->
    <div id="point-name-modal" class="modal fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-[2000]">
        <div class="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm">
            <h2 class="text-xl font-bold mb-4">ポイント名を入力</h2>
            <input type="text" id="point-name-input" class="w-full p-2 border rounded mb-4" placeholder="例: 境界杭A-1">
            <div class="flex justify-between items-center">
                <button id="suggest-name-btn" class="px-4 py-2 bg-yellow-400 text-white rounded hover:bg-yellow-500">✨ AI提案</button>
                <div class="flex space-x-3">
                    <button id="cancel-point-name" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">キャンセル</button>
                    <button id="save-point-name" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">保存</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 削除確認モーダル -->
    <div id="delete-confirm-modal" class="modal fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-[2000]">
        <div class="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm text-center">
            <h2 class="text-xl font-bold mb-2">ポイントの削除</h2>
            <p id="delete-confirm-text" class="mb-6">このポイントを削除しますか？</p>
            <div class="flex justify-center space-x-4">
                <button id="cancel-delete-btn" class="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400">キャンセル</button>
                <button id="confirm-delete-btn" class="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">削除</button>
            </div>
        </div>
    </div>
    
    <!-- 全データ削除確認モーダル -->
    <div id="delete-all-confirm-modal" class="modal fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-[2000]">
        <div class="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm text-center">
            <h2 class="text-xl font-bold mb-2">全データ削除</h2>
            <p id="delete-all-confirm-text" class="mb-6">すべての記録済み・インポート済みポイントを削除しますか？<br><strong class="text-red-600">この操作は元に戻せません。</strong></p>
            <div class="flex justify-center space-x-4">
                <button id="cancel-delete-all-btn" class="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400">キャンセル</button>
                <button id="confirm-delete-all-btn" class="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">削除</button>
            </div>
        </div>
    </div>

    <!-- 日報生成モーダル -->
    <div id="report-modal" class="modal fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-[2000]">
        <div class="bg-white p-4 rounded-lg shadow-xl w-11/12 max-w-lg h-4/5 flex flex-col">
            <h2 class="text-xl font-bold mb-2 flex-shrink-0">✨ AI生成 作業日報</h2>
            <div id="report-content" class="flex-grow bg-gray-100 p-2 border rounded overflow-y-auto custom-scrollbar">
                <!-- ここにスピナーまたは生成されたテキストが入る -->
            </div>
            <div class="flex justify-between items-center mt-2 flex-shrink-0">
                <button id="copy-report-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400" disabled>クリップボードにコピー</button>
                <button id="close-report-btn" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">閉じる</button>
            </div>
        </div>
    </div>

    <!-- 汎用アラートモーダル -->
    <div id="alert-modal" class="modal fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-[3000]">
        <div class="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm text-center">
            <h2 id="alert-title" class="text-xl font-bold mb-2">情報</h2>
            <p id="alert-message" class="mb-6">メッセージ</p>
            <div class="flex justify-center">
                <button id="alert-ok-btn" class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">OK</button>
            </div>
        </div>
    </div>

    <!-- ライブラリとアプリのスクリプト読み込み -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="logic.js"></script>
    <script src="ui.js"></script>
    <script src="main.js"></script>

    <!-- ▼▼▼ 修正箇所: Service Worker 登録スクリプト ▼▼▼ -->
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
              console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
              console.log('ServiceWorker registration failed: ', error);
            });
        });
      }
    </script>
    <!-- ▲▲▲ 修正箇所 ここまで ▲▲▲ -->
</body>
</html>
