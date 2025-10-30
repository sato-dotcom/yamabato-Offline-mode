// --- DOM要素の初期化 ---
function initializeDOMElements() {
    dom = {
        map: document.getElementById('map'),
        modeAcquireTab: document.getElementById('mode-acquire-tab'),
        modeNavigateTab: document.getElementById('mode-navigate-tab'),
        panelAcquire: document.getElementById('panel-acquire'),
        panelNavigate: document.getElementById('panel-navigate'),
        currentLat: document.getElementById('current-lat'),
        currentLon: document.getElementById('current-lon'),
        currentX: document.getElementById('current-x'),
        currentY: document.getElementById('current-y'),
        currentAcc: document.getElementById('current-acc'),
        gpsStatus: document.getElementById('gps-status'),
        gnssStatus: document.getElementById('gnss-status'),
        currentCoordSystemSelect: document.getElementById('current-coord-system-select'),
        recordPointBtn: document.getElementById('record-point-btn'),
        pointList: document.getElementById('point-list'),
        exportCoordSystemSelect: document.getElementById('export-coord-system-select'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        generateReportBtn: document.getElementById('generate-report-btn'),
        deleteAllBtn: document.getElementById('delete-all-btn'),
        importCoordSystemSelect: document.getElementById('import-coord-system-select'),
        importCsvBtn: document.getElementById('import-csv-btn'),
        csvFileInput: document.getElementById('csv-file-input'),
        importedPointList: document.getElementById('imported-point-list'),
        manualInputLatLonTab: document.getElementById('manual-input-latlon-tab'),
        manualInputXyTab: document.getElementById('manual-input-xy-tab'),
        manualInputLatLonPanel: document.getElementById('manual-input-latlon-panel'),
        manualInputXyPanel: document.getElementById('manual-input-xy-panel'),
        manualXyCoordSystemSelect: document.getElementById('manual-xy-coord-system-select'),
        targetYInput: document.getElementById('target-y-input'),
        targetXInput: document.getElementById('target-x-input'),
        targetLatInput: document.getElementById('target-lat-input'),
        targetLonInput: document.getElementById('target-lon-input'),
        setTargetBtn: document.getElementById('set-target-btn'),
        navigationInfo: document.getElementById('navigation-info'),
        distanceToTarget: document.getElementById('distance-to-target'),
        bearingArrow: document.getElementById('bearing-arrow'),
        bearingText: document.getElementById('bearing-text'),
        northSouthInfo: document.getElementById('north-south-info'),
        eastWestInfo: document.getElementById('east-west-info'),
        pointNameModal: document.getElementById('point-name-modal'),
        pointNameInput: document.getElementById('point-name-input'),
        suggestNameBtn: document.getElementById('suggest-name-btn'),
        cancelPointNameBtn: document.getElementById('cancel-point-name'),
        savePointNameBtn: document.getElementById('save-point-name'),
        deleteConfirmModal: document.getElementById('delete-confirm-modal'),
        deleteConfirmText: document.getElementById('delete-confirm-text'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
        deleteAllConfirmModal: document.getElementById('delete-all-confirm-modal'),
        cancelDeleteAllBtn: document.getElementById('cancel-delete-all-btn'),
        confirmDeleteAllBtn: document.getElementById('confirm-delete-all-btn'),
        reportModal: document.getElementById('report-modal'),
        reportContent: document.getElementById('report-content'),
        copyReportBtn: document.getElementById('copy-report-btn'),
        closeReportBtn: document.getElementById('close-report-btn'),
        fullscreenInfoPanel: document.getElementById('fullscreen-info-panel'),
        fullscreenNavInfo: document.getElementById('fullscreen-nav-info'),
        fullscreenLat: document.getElementById('fullscreen-lat'),
        fullscreenLon: document.getElementById('fullscreen-lon'),
        fullscreenAcc: document.getElementById('fullscreen-acc'),
        fullscreenGnssStatus: document.getElementById('fullscreen-gnss-status'),
        fullscreenDistance: document.getElementById('fullscreen-distance'),
        fullscreenBearingText: document.getElementById('fullscreen-bearing-text'),
        alertModal: document.getElementById('alert-modal'),
        alertTitle: document.getElementById('alert-title'),
        alertMessage: document.getElementById('alert-message'),
        alertOkBtn: document.getElementById('alert-ok-btn'),
        followUserBtn: null, // 動的に生成されるため後で設定
    };
}

// --- UIモード切替 ---
function switchMode(mode) {
    currentMode = mode;
    if (mode === 'acquire') {
        dom.modeAcquireTab.classList.add('text-blue-600', 'border-blue-600');
        dom.modeAcquireTab.classList.remove('text-gray-500');
        dom.modeNavigateTab.classList.remove('text-blue-600', 'border-blue-600');
        dom.modeNavigateTab.classList.add('text-gray-500');
        dom.panelAcquire.style.display = 'block';
        dom.panelNavigate.style.display = 'none';
        clearNavigation();
    } else { // navigate
        dom.modeNavigateTab.classList.add('text-blue-600', 'border-blue-600');
        dom.modeNavigateTab.classList.remove('text-gray-500');
        dom.modeAcquireTab.classList.remove('text-blue-600', 'border-blue-600');
        dom.modeAcquireTab.classList.add('text-gray-500');
        dom.panelAcquire.style.display = 'none';
        dom.panelNavigate.style.display = 'block';
    }
}

function switchManualInput(mode) {
    manualInputMode = mode;
    if (mode === 'latlon') {
        dom.manualInputLatLonPanel.classList.remove('hidden');
        dom.manualInputXyPanel.classList.add('hidden');
        dom.manualInputLatLonTab.classList.add('bg-purple-500', 'text-white');
        dom.manualInputLatLonTab.classList.remove('bg-gray-200', 'text-gray-600');
        dom.manualInputXyTab.classList.add('bg-gray-200', 'text-gray-600');
        dom.manualInputXyTab.classList.remove('bg-purple-500', 'text-white');
    } else { // xy
        dom.manualInputLatLonPanel.classList.add('hidden');
        dom.manualInputXyPanel.classList.remove('hidden');
        dom.manualInputXyTab.classList.add('bg-purple-500', 'text-white');
        dom.manualInputXyTab.classList.remove('bg-gray-200', 'text-gray-600');
        dom.manualInputLatLonTab.classList.add('bg-gray-200', 'text-gray-600');
        dom.manualInputLatLonTab.classList.remove('bg-purple-500', 'text-white');
    }
}

// --- GPS・現在地情報のUI更新 ---
function updatePositionDisplay(lat, lon, acc) {
    const latStr = lat.toFixed(7);
    const lonStr = lon.toFixed(7);
    const accStr = acc.toFixed(1);

    // メインパネル
    dom.currentLat.textContent = latStr;
    dom.currentLon.textContent = lonStr;
    dom.currentAcc.textContent = accStr;

    // 全画面パネル
    dom.fullscreenLat.textContent = latStr;
    dom.fullscreenLon.textContent = lonStr;
    dom.fullscreenAcc.textContent = accStr;
}

function updateGpsStatus(message, type) {
    const statusClasses = {
        'success': 'bg-green-100 text-green-800',
        'error': 'bg-red-100 text-red-800',
        'default': 'bg-yellow-100 text-yellow-800'
    };
    dom.gpsStatus.textContent = message;
    dom.gpsStatus.className = `${statusClasses[type] || statusClasses['default']} px-2 py-1 rounded-full font-mono text-xs`;
}

function getGnssStatus(accuracy) {
    if (accuracy <= 0.5) return { text: 'FIX', colorClass: 'text-green-600 font-bold' };
    if (accuracy <= 2.0) return { text: 'FLOAT', colorClass: 'text-blue-600 font-bold' };
    return { text: 'SINGLE', colorClass: 'text-orange-600 font-bold' };
}

function updateGnssStatusDisplay(text, colorClass) {
    dom.gnssStatus.textContent = text;
    dom.gnssStatus.className = `font-mono text-xs ${colorClass}`;
    dom.fullscreenGnssStatus.textContent = text;
    dom.fullscreenGnssStatus.className = `font-mono text-xs ${colorClass}`;
}

function updateCurrentXYDisplay() {
    if (currentPosition) {
        const { latitude, longitude } = currentPosition.coords;
        const selectedZone = dom.currentCoordSystemSelect.value;
        if (selectedZone) {
            const xy = convertToXY(latitude, longitude, selectedZone);
            dom.currentX.textContent = xy.x.toFixed(3);
            dom.currentY.textContent = xy.y.toFixed(3);
        }
    }
}

// --- ポイントリストのUI更新 ---
function updatePointList() {
    dom.pointList.innerHTML = '';
    if (recordedPoints.length === 0) {
        dom.pointList.innerHTML = '<p class="text-gray-500 text-sm">まだ記録はありません。</p>';
        dom.exportCsvBtn.disabled = true;
        dom.generateReportBtn.disabled = true;
    } else {
        dom.exportCsvBtn.disabled = false;
        dom.generateReportBtn.disabled = false;
        recordedPoints.forEach((p, index) => {
            const item = document.createElement('div');
            const visibilityClass = p.isVisible ? '' : 'opacity-50';
            const iconClass = p.isVisible ? 'fa-eye' : 'fa-eye-slash';
            const iconColor = p.isVisible ? 'text-gray-500' : 'text-gray-300';
            
            item.className = `p-2 border-b flex justify-between items-center ${visibilityClass}`;
            item.innerHTML = `
                <div>
                    <p class="font-semibold text-sm">${p.name}</p>
                    <p class="text-xs font-mono">Lat: ${p.lat.toFixed(6)}, Lon: ${p.lon.toFixed(6)}</p>
                </div>
                <div class="flex items-center">
                    <button class="toggle-visibility-btn ${iconColor} hover:text-blue-500 p-2" data-index="${index}">
                        <i class="fas ${iconClass}"></i>
                    </button>
                    <button class="delete-point-btn text-red-500 hover:text-red-700 p-2" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            dom.pointList.appendChild(item);
        });
    }
    dom.deleteAllBtn.disabled = recordedPoints.length === 0 && importedPoints.length === 0;
}

function updateImportedPointList() {
    dom.importedPointList.innerHTML = '';
    if (importedPoints.length === 0) {
        dom.importedPointList.innerHTML = '<p class="text-gray-500 text-sm">ファイルが読み込まれていません。</p>';
    } else {
        importedPoints.forEach((p, index) => {
            const item = document.createElement('div');
            const visibilityClass = p.isVisible ? '' : 'opacity-50';
            const iconClass = p.isVisible ? 'fa-eye' : 'fa-eye-slash';
            const iconColor = p.isVisible ? 'text-gray-500' : 'text-gray-300';

            item.className = `p-2 border-b flex justify-between items-center ${visibilityClass}`;
            item.innerHTML = `
                <div class="flex-grow cursor-pointer hover:bg-gray-100 rounded-md p-1" data-index="${index}" title="このポイントを目標に設定">
                    <p class="font-semibold text-sm">${p.name}</p>
                    <p class="text-xs font-mono">Lat: ${p.lat.toFixed(6)}, Lon: ${p.lon.toFixed(6)}</p>
                </div>
                <button class="toggle-visibility-btn ${iconColor} hover:text-blue-500 p-2" data-index="${index}" title="表示/非表示の切り替え">
                    <i class="fas ${iconClass}"></i>
                </button>
            `;
            dom.importedPointList.appendChild(item);
        });
    }
    dom.deleteAllBtn.disabled = recordedPoints.length === 0 && importedPoints.length === 0;
}

// --- 地図操作のUI ---
function toggleFollowUser() {
    isFollowingUser = !isFollowingUser;
    if (isFollowingUser && currentPosition) {
        map.setView([currentPosition.coords.latitude, currentPosition.coords.longitude], 18);
    }
    updateFollowButtonState();
}

function updateFollowButtonState() {
    if(!dom.followUserBtn) return;
    if (isFollowingUser) {
        dom.followUserBtn.classList.add('following');
        dom.followUserBtn.classList.remove('not-following');
        dom.followUserBtn.title = '現在地に追従中 (クリックで解除)';
    } else {
        dom.followUserBtn.classList.remove('following');
        dom.followUserBtn.classList.add('not-following');
        dom.followUserBtn.title = '現在地への追従を再開';
    }
}

function toggleFullscreen() {
    document.body.classList.toggle('fullscreen-active');
    const btn = document.getElementById('fullscreen-btn');
    const icon = btn.querySelector('i');
    if (document.body.classList.contains('fullscreen-active')) {
        icon.classList.replace('fa-expand', 'fa-compress');
        btn.title = '通常表示に戻る';
    } else {
        icon.classList.replace('fa-compress', 'fa-expand');
        btn.title = '全画面表示';
    }
    setTimeout(() => map.invalidateSize(), 300); 
}

// --- ナビゲーションUI ---
function clearNavigation() {
    if (targetMarker) { map.removeLayer(targetMarker); targetMarker = null; }
    if (targetCircle) { map.removeLayer(targetCircle); targetCircle = null; }
    if (navLine) { map.removeLayer(navLine); navLine = null; }
    
    dom.navigationInfo.classList.add('hidden');
    dom.fullscreenNavInfo.classList.add('hidden');
    dom.targetLatInput.value = '';
    dom.targetLonInput.value = '';
    dom.targetXInput.value = '';
    dom.targetYInput.value = '';
}

function updateNavigationInfo() {
    if (!currentPosition || !targetMarker) return;
    const from = currentUserMarker.getLatLng();
    const to = targetMarker.getLatLng();
    const distance = from.distanceTo(to);
    const bearing = calculateBearing(from.lat, from.lng, to.lat, to.lng);
    const direction = bearingToDirection(bearing);

    // メインパネル
    dom.distanceToTarget.textContent = `${distance.toFixed(2)} m`;
    dom.bearingArrow.style.transform = `rotate(${bearing}deg)`;
    dom.bearingText.textContent = direction;
    
    // 全画面パネル
    dom.fullscreenDistance.textContent = distance.toFixed(2);
    dom.fullscreenBearingText.textContent = direction;

    const { distNS, dirNS, distEW, dirEW } = calculateNSEW(from, to);
    dom.northSouthInfo.textContent = `${dirNS} ${distNS.toFixed(2)} m`;
    dom.eastWestInfo.textContent = `${dirEW} ${distEW.toFixed(2)} m`;
    
    // 距離に応じた色分け
    if (distance < 1) { dom.distanceToTarget.className = 'text-3xl font-bold text-green-600 my-1'; } 
    else if (distance < 5) { dom.distanceToTarget.className = 'text-3xl font-bold text-yellow-600 my-1'; } 
    else { dom.distanceToTarget.className = 'text-3xl font-bold text-indigo-600 my-1'; }

    // 誘導ラインの更新
    if (!navLine) {
        navLine = L.polyline([from, to], { color: 'purple', dashArray: '5, 10' }).addTo(map);
    } else {
        navLine.setLatLngs([from, to]);
    }
}

function showNavigationInfo() {
    dom.navigationInfo.classList.remove('hidden');
    dom.fullscreenNavInfo.classList.remove('hidden');
}

// --- モーダルUI ---
function showModal(modalElement) {
    modalElement.classList.add('is-open');
}

function hideModal(modalElement) {
    modalElement.classList.remove('is-open');
}

function showAlert(message, title = '情報') {
    dom.alertTitle.textContent = title;
    dom.alertMessage.textContent = message;
    showModal(dom.alertModal);
}

function showPointNameModal(defaultName) {
    dom.pointNameInput.value = defaultName;
    showModal(dom.pointNameModal);
    dom.pointNameInput.focus();
    dom.pointNameInput.select();
}

function showDeleteConfirmation(index) {
    if (index < 0 || index >= recordedPoints.length) return;
    indexToDelete = index;
    const pointName = recordedPoints[index].name;
    dom.deleteConfirmText.textContent = `「${pointName}」を本当に削除しますか？`;
    showModal(dom.deleteConfirmModal);
}

function showReportModal(isLoading, reportText = null) {
    showModal(dom.reportModal);
    dom.copyReportBtn.disabled = true;

    if (isLoading) {
        dom.reportContent.innerHTML = '<div class="flex justify-center items-center h-full"><div class="spinner"></div></div>';
    } else if (reportText) {
        let htmlReport = reportText
            .replace(/# (.*)/g, '<h3>$1</h3>')
            .replace(/\* \*\*(.*)\*\*:/g, '<p><strong>$1</strong>:</p>')
            .replace(/\n/g, '<br>');
        dom.reportContent.innerHTML = `<div class="prose max-w-none p-2">${htmlReport}</div><textarea class="hidden">${reportText}</textarea>`;
        dom.copyReportBtn.disabled = false;
    } else {
        dom.reportContent.innerHTML = `<p class="text-red-500">日報の生成に失敗しました。</p>`;
    }
}

function copyReportToClipboard() {
    const reportTextArea = dom.reportContent.querySelector('textarea');
    if (!reportTextArea || !reportTextArea.value) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(reportTextArea.value).then(() => {
            showAlert('日報をクリップボードにコピーしました。');
        }).catch(err => showAlert('コピーに失敗しました。', 'エラー'));
    } else { // Fallback for older browsers
        try {
            reportTextArea.classList.remove('hidden');
            reportTextArea.select();
            document.execCommand('copy');
            reportTextArea.classList.add('hidden');
            showAlert('日報をクリップボードにコピーしました。(Fallback)');
        } catch (e) {
            showAlert('コピーに失敗しました。', 'エラー');
        }
    }
}

function toggleSpinner(button, show, originalText = '') {
    if (show) {
        button.innerHTML = '<div class="spinner w-5 h-5 mx-auto"></div>';
        button.disabled = true;
    } else {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// --- ヘルパー関数 ---
function createTargetMarker(lat, lon, popupText, color = 'red') {
    const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`;
    return L.marker([lat, lon], {
        icon: L.icon({
            iconUrl: iconUrl,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        })
    }).addTo(map).bindPopup(`<b>${popupText}</b>`);
}


// --- 座標系関連 ---
const JGD2011_PROJ_DEFS = {
    1: { name: "I系 (長崎, 鹿児島(島嶼))", def: "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    2: { name: "II系 (福岡, 佐賀, 熊本, 大分, 宮崎, 鹿児島)", def: "+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    3: { name: "III系 (山口, 島根, 広島)", def: "+proj=tmerc +lat_0=36 +lon_0=132.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    4: { name: "IV系 (香川, 愛媛, 高知, 徳島)", def: "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    5: { name: "V系 (兵庫, 鳥取, 岡山)", def: "+proj=tmerc +lat_0=36 +lon_0=134.3333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    6: { name: "VI系 (京都, 大阪, 福井, 滋賀, 三重, 奈良, 和歌山)", def: "+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    7: { name: "VII系 (石川, 富山, 岐阜, 愛知)", def: "+proj=tmerc +lat_0=36 +lon_0=137.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    8: { name: "VIII系 (新潟, 長野, 山梨, 静岡)", def: "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    9: { name: "IX系 (東京(本土), 埼玉, 群馬, 栃木, 茨城, 千葉, 神奈川)", def: "+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    10: { name: "X系 (青森, 秋田, 山形, 岩手, 宮城, 福島)", def: "+proj=tmerc +lat_0=40 +lon_0=140.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    11: { name: "XI系 (北海道(南西))", def: "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    12: { name: "XII系 (北海道(中央))", def: "+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    13: { name: "XIII系 (北海道(東))", def: "+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    14: { name: "XIV系 (東京(小笠原))", def: "+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    15: { name: "XV系 (沖縄)", def: "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    16: { name: "XVI系 (沖縄(先島))", def: "+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    17: { name: "XVII系 (沖縄(大東))", def: "+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    18: { name: "XVIII系 (東京(沖ノ鳥島))", def: "+proj=tmerc +lat_0=20.41666666666667 +lon_0=136.0833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
    19: { name: "XIX系 (東京(南鳥島))", def: "+proj=tmerc +lat_0=24.25 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs" },
};

function initializeCoordSystemSelector() {
    const selectors = [
        dom.exportCoordSystemSelect,
        dom.importCoordSystemSelect,
        dom.manualXyCoordSystemSelect,
        dom.currentCoordSystemSelect
    ];
    selectors.forEach(selector => {
        selector.innerHTML = ''; // Clear existing options
        for (const key in JGD2011_PROJ_DEFS) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = JGD2011_PROJ_DEFS[key].name;
            selector.appendChild(option);
        }
    });
    // Set a default value, e.g., '3' for Yamaguchi
    dom.currentCoordSystemSelect.value = '3';
    dom.exportCoordSystemSelect.value = '3';
    dom.importCoordSystemSelect.value = '3';
    dom.manualXyCoordSystemSelect.value = '3';
}

function convertToXY(lat, lon, zone) {
    const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
    const jgd2011 = JGD2011_PROJ_DEFS[zone].def;
    const converted = proj4(wgs84, jgd2011, [lon, lat]);
    return { x: converted[1], y: converted[0] };
}

function convertToLatLon(x, y, zone) {
    const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
    const jgd2011 = JGD2011_PROJ_DEFS[zone].def;
    const converter = proj4(jgd2011, wgs84);
    const converted = converter.forward([y, x]);
    return { lon: converted[0], lat: converted[1] };
}


// --- 計算ヘルパー関数 ---
function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const y = Math.sin((lon2 - lon1) * toRad) * Math.cos(lat2 * toRad);
    const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
              Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lon2 - lon1) * toRad);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

function bearingToDirection(bearing) {
    const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
}

function calculateNSEW(from, to) {
    const R = 6371e3; // metres
    const toRad = Math.PI/180;
    
    const latDiff = to.lat - from.lat;
    const lonDiff = to.lng - from.lng;

    const deltaPhi = latDiff * toRad;
    const deltaLambda = lonDiff * toRad;
    
    const phi1 = from.lat * toRad;
    const phi2 = to.lat * toRad;

    const distNS = Math.abs(deltaPhi * R);
    const distEW = Math.abs(deltaLambda * R * Math.cos((phi1+phi2)/2));

    const dirNS = latDiff >= 0 ? '北へ' : '南へ';
    const dirEW = lonDiff >= 0 ? '東へ' : '西へ';

    return { distNS, dirNS, distEW, dirEW };
}

