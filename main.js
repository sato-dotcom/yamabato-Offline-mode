// --- グローバル変数 ---
let map, watchId;
let currentPosition = null;
let currentUserMarker = null;
let targetMarker = null;
let targetCircle = null;
let navLine = null;
let recordedPoints = [];
let importedPoints = [];
let tempCoordsForModal = null;
let currentMode = 'acquire'; // 'acquire' or 'navigate'
let indexToDelete = null; // 削除対象のインデックスを保持
let manualInputMode = 'latlon'; // 'latlon' or 'xy'
let isFollowingUser = true; // 現在地追従モードの状態
let currentGnssStatus = '---'; // GNSSステータスを保持

// --- DOM要素の取得 ---
// アプリケーションのUI要素を格納するグローバルオブジェクト
// ui.jsで定義される
let dom = {}; 

// --- 初期化処理 ---
window.onload = () => {
    // UI要素をDOMから取得し、domオブジェクトに格納
    initializeDOMElements(); 
    // 地図の初期設定
    initializeMap();
    // 座標系選択プルダウンの初期設定
    initializeCoordSystemSelector();
    // GPSによる位置情報取得を開始
    startGeolocation();
    // すべてのイベントリスナーを設定
    setupEventListeners();
    // ローカルストレージからデータを読み込む
    loadData(); 
};

// --- 地図の初期設定 ---
function initializeMap() {
    // 背景地図レイヤーの定義
    const gsiStdLayer = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
        maxZoom: 22, maxNativeZoom: 18
    });
    const gsiPhotoLayer = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
        maxZoom: 22, maxNativeZoom: 18
    });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 22,
    });
    
    // 重ね合わせるカスタムレイヤーの定義
    const forestLayer = L.tileLayer('https://rinpan-f93d64.netlify.app/{z}/{x}/{y}.png', {
        attribution: '森林区画 (カスタム)',
        minZoom: 15, maxZoom: 22, maxNativeZoom: 20, transparent: true
    });
    
    // --- 変更箇所 ---
    // 「登記情報 (カスタム)」レイヤーのURL、著作権表示、ズームレベルを変更
    const registryLayer = L.tileLayer('https://yamabato-tiseki-saijo-4d9a42.netlify.app/{z}/{x}/{y}.png', {
        attribution: 'TJL', // 著作権表示を変更
        minZoom: 15,          // 最小ズームレベルを変更
        maxZoom: 22,          // 最大ズームレベル（マップの表示限界）
        maxNativeZoom: 20,    // レイヤーが提供する最大ズーム（これ以上は引き伸ばし）
        transparent: true     // 背景透過
    });
    // --- 変更箇所ここまで ---

    const referenceLayer = L.tileLayer('https://snkozu-72971b.netlify.app/{z}/{x}/{y}.png', {
        attribution: '参考図 (カスタム)',
        minZoom: 15, maxZoom: 22, maxNativeZoom: 20, transparent: true
    });

    // 地図オブジェクトの生成
    map = L.map(dom.map, { zoomControl: false, layers: [gsiStdLayer] }).setView([34.1859, 131.4714], 13);
    
    // 標準コントロールの追加
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    // 背景地図とオーバーレイ地図の定義
    const baseMaps = { 
        "標準地図 (等高線)": gsiStdLayer, 
        "航空写真": gsiPhotoLayer, 
        "OpenStreetMap": osmLayer 
    };
    const overlayMaps = {
        "森林区画 (カスタム)": forestLayer,
        "登記情報 (カスタム)": registryLayer,
        "参考図 (カスタム)": referenceLayer
    };

    // レイヤーコントロールを追加
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);
    
    // --- カスタムコントロールの追加 ---
    // 現在地追従ボタン
    const FollowControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = `<a id="follow-user-btn" href="#" title="現在地に追従" class="leaflet-control-custom-btn"><i class="fas fa-location-crosshairs"></i></a>`;
            L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation)
                      .on(container, 'click', L.DomEvent.preventDefault)
                      .on(container, 'click', toggleFollowUser);
            return container;
        }
    });
    map.addControl(new FollowControl());

    // 全画面表示ボタン
    const FullscreenControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = `<a id="fullscreen-btn" href="#" title="全画面表示" class="leaflet-control-custom-btn"><i class="fas fa-expand"></i></a>`;
            L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation)
                      .on(container, 'click', L.DomEvent.preventDefault)
                      .on(container, 'click', toggleFullscreen);
            return container;
        }
    });
    map.addControl(new FullscreenControl());

    // 現在地マーカーの初期化
    currentUserMarker = L.circleMarker([0, 0], { radius: 8, color: '#1e90ff', fillColor: '#1e90ff', fillOpacity: 0.8 }).addTo(map);
}

// --- GPS位置情報の取得開始 ---
function startGeolocation() {
    if (!navigator.geolocation) {
        updateGpsStatus("ブラウザが非対応です", 'error');
        return;
    }
    watchId = navigator.geolocation.watchPosition(handlePositionSuccess, handlePositionError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

// --- イベントリスナーの一括設定 ---
function setupEventListeners() {
    // DOM要素への参照を再設定（動的に生成されるため）
    dom.followUserBtn = document.getElementById('follow-user-btn');
    updateFollowButtonState(); // 初期状態を設定

    // モード切替タブ
    dom.modeAcquireTab.addEventListener('click', () => switchMode('acquire'));
    dom.modeNavigateTab.addEventListener('click', () => switchMode('navigate'));
    
    // 座標取得パネル
    dom.recordPointBtn.addEventListener('click', handleRecordPoint);
    dom.exportCsvBtn.addEventListener('click', exportToCSV);
    dom.generateReportBtn.addEventListener('click', handleGenerateReport);
    dom.deleteAllBtn.addEventListener('click', () => showModal(dom.deleteAllConfirmModal));
    
    // 座標誘導パネル
    dom.importCsvBtn.addEventListener('click', () => dom.csvFileInput.click());
    dom.csvFileInput.addEventListener('change', handleFileImport);
    dom.manualInputLatLonTab.addEventListener('click', () => switchManualInput('latlon'));
    dom.manualInputXyTab.addEventListener('click', () => switchManualInput('xy'));
    dom.setTargetBtn.addEventListener('click', handleSetTargetManual);
    
    // モーダル
    dom.savePointNameBtn.addEventListener('click', savePointName);
    dom.cancelPointNameBtn.addEventListener('click', () => hideModal(dom.pointNameModal));
    dom.suggestNameBtn.addEventListener('click', handleSuggestName);
    dom.cancelDeleteBtn.addEventListener('click', () => {
        hideModal(dom.deleteConfirmModal);
        indexToDelete = null;
    });
    dom.confirmDeleteBtn.addEventListener('click', confirmDeletePoint);
    dom.cancelDeleteAllBtn.addEventListener('click', () => hideModal(dom.deleteAllConfirmModal));
    dom.confirmDeleteAllBtn.addEventListener('click', deleteAllData);
    dom.closeReportBtn.addEventListener('click', () => hideModal(dom.reportModal));
    dom.copyReportBtn.addEventListener('click', copyReportToClipboard);
    dom.alertOkBtn.addEventListener('click', () => hideModal(dom.alertModal));

    // ポイントリストのクリックイベント（イベント委任）
    dom.pointList.addEventListener('click', handlePointListClick);
    dom.importedPointList.addEventListener('click', handleImportedListClick);

    // 地図のドラッグイベント
    map.on('dragstart', () => {
        if (isFollowingUser) {
            isFollowingUser = false;
            updateFollowButtonState();
        }
    });
    
    // 設定変更時の自動保存
    dom.currentCoordSystemSelect.addEventListener('change', () => {
        updateCurrentXYDisplay();
        saveData();
    });
    dom.exportCoordSystemSelect.addEventListener('change', saveData);
    dom.importCoordSystemSelect.addEventListener('change', saveData);
    dom.manualXyCoordSystemSelect.addEventListener('change', saveData);
}

