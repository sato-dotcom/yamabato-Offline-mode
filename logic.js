// --- GPS関連のロジック ---

// GPSの測位成功時の処理
function handlePositionSuccess(position) {
    currentPosition = position;
    const { latitude, longitude, accuracy } = position.coords;
    
    // UIの更新 (ui.jsの関数を呼び出し)
    updatePositionDisplay(latitude, longitude, accuracy);
    updateGpsStatus("GPS受信中", 'success');
    
    // GNSSステータスの判定と更新
    const statusInfo = getGnssStatus(accuracy);
    currentGnssStatus = statusInfo.text;
    updateGnssStatusDisplay(statusInfo.text, statusInfo.colorClass);

    // 現在地のXY座標を更新
    updateCurrentXYDisplay();

    // 地図上のマーカーとビューを更新
    const latLng = [latitude, longitude];
    currentUserMarker.setLatLng(latLng);
    if (isFollowingUser) {
        map.setView(latLng, 18);
    }
    
    // ナビゲーションモードであれば、目標への情報を更新
    if (currentMode === 'navigate' && targetMarker) {
        updateNavigationInfo();
    }
}

// GPSの測位失敗時の処理
function handlePositionError(error) {
    let msg = "測位エラー";
    if (error.code === 1) msg = "アクセス拒否";
    if (error.code === 2) msg = "測位不可";
    if (error.code === 3) msg = "タイムアウト";
    updateGpsStatus(msg, 'error');
}

// --- ポイント記録・管理のロジック ---

// 「現在地を記録」ボタンが押された時の処理
function handleRecordPoint() {
    if (!currentPosition) {
        showAlert("現在地が特定できていません。", "エラー");
        return;
    }
    // モーダル表示用に現在地情報を一時保存
    tempCoordsForModal = { 
        lat: currentPosition.coords.latitude, 
        lon: currentPosition.coords.longitude, 
        acc: currentPosition.coords.accuracy, 
        status: currentGnssStatus 
    };
    // ポイント名入力モーダルを表示 (ui.jsの関数)
    showPointNameModal(`ポイント ${recordedPoints.length + 1}`);
}

// ポイント名を保存する処理
function savePointName() {
    const name = dom.pointNameInput.value.trim() || '名称未設定';
    
    // Leafletマーカーを作成
    const marker = L.marker([tempCoordsForModal.lat, tempCoordsForModal.lon])
        .addTo(map)
        .bindPopup(`<b>${name}</b><br>緯度: ${tempCoordsForModal.lat.toFixed(6)}<br>経度: ${tempCoordsForModal.lon.toFixed(6)}`);

    // ポイントオブジェクトを作成
    const point = {
        name: name,
        lat: tempCoordsForModal.lat,
        lon: tempCoordsForModal.lon,
        acc: tempCoordsForModal.acc,
        status: tempCoordsForModal.status,
        timestamp: new Date().toISOString(),
        marker: marker,
        isVisible: true 
    };
    recordedPoints.push(point);
    
    updatePointList(); // UI更新
    saveData();      // データ保存
    hideModal(dom.pointNameModal); // モーダルを閉じる
}

// ポイントリストのクリックイベント処理
function handlePointListClick(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const index = parseInt(target.dataset.index);
    if (target.classList.contains('toggle-visibility-btn')) {
        togglePointVisibility(index, 'recorded');
    } else if (target.classList.contains('delete-point-btn')) {
        showDeleteConfirmation(index);
    }
}

// ポイントの表示/非表示を切り替え
function togglePointVisibility(index, type) {
    const pointArray = (type === 'recorded') ? recordedPoints : importedPoints;
    const point = pointArray[index];
    if (!point) return;

    point.isVisible = !point.isVisible; 

    if (point.isVisible) {
        if(point.marker) point.marker.addTo(map);
    } else {
        if(point.marker) map.removeLayer(point.marker);
    }

    // 対応するリストのUIを更新
    if (type === 'recorded') {
        updatePointList();
    } else {
        updateImportedPointList();
    }
    saveData(); // 状態を保存
}

// ポイント削除の最終確認
function confirmDeletePoint() {
    if (indexToDelete !== null) {
        if(recordedPoints[indexToDelete] && recordedPoints[indexToDelete].marker) {
            map.removeLayer(recordedPoints[indexToDelete].marker);
        }
        recordedPoints.splice(indexToDelete, 1);
        updatePointList();
        saveData(); // 削除後も保存
    }
    hideModal(dom.deleteConfirmModal);
    indexToDelete = null;
}

// --- CSVインポート・エクスポート関連 ---

// CSV形式でデータをエクスポート
function exportToCSV() {
    if (recordedPoints.length === 0) {
        showAlert("エクスポートするポイントがありません。", "情報");
        return;
    }
    const selectedZone = dom.exportCoordSystemSelect.value;
    let csvContent = '\uFEFF'; // BOM for Excel
    csvContent += "測点名,緯度,経度,X座標(m),Y座標(m),精度(m),GNSSステータス,測地系,タイムスタンプ\r\n";
    
    recordedPoints.forEach(p => {
        const xy = convertToXY(p.lat, p.lon, selectedZone);
        const name = `"${p.name.replace(/"/g, '""')}"`; // Handle quotes in names
        csvContent += `${name},${p.lat.toFixed(8)},${p.lon.toFixed(8)},${xy.x.toFixed(4)},${xy.y.toFixed(4)},${p.acc.toFixed(2)},${p.status},${selectedZone}系,${p.timestamp}\r\n`;
    });
    
    // ダウンロードリンクを生成してクリック
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
    link.setAttribute("download", `survey_points_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ファイル選択後のCSVインポート処理
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const selectedZone = dom.importCoordSystemSelect.value;
        
        // 既存のインポート済みポイントをクリア
        importedPoints.forEach(p => p.marker && map.removeLayer(p.marker));
        importedPoints = [];

        const rows = text.split(/\r?\n/);
        // ヘッダー行があればスキップ
        if (rows.length > 0 && isNaN(parseFloat(rows[0].split(',')[1]))) {
            rows.shift();
        }

        rows.forEach((row, i) => {
            if (row.trim() === '') return;
            const cols = row.split(',');
            if (cols.length >= 3) {
                const name = cols[0].replace(/"/g, '');
                const surveyY = parseFloat(cols[1]); // Y in CSV (Easting)
                const surveyX = parseFloat(cols[2]); // X in CSV (Northing)
                if (!isNaN(surveyX) && !isNaN(surveyY)) {
                    const latLon = convertToLatLon(surveyX, surveyY, selectedZone);
                    const marker = createTargetMarker(latLon.lat, latLon.lon, `${name} (インポート)`, 'orange');
                    
                    importedPoints.push({ name, lat: latLon.lat, lon: latLon.lon, marker, isVisible: true });
                }
            }
        });
        updateImportedPointList();
        saveData(); // インポート後に保存
    };
    reader.readAsText(file);
    dom.csvFileInput.value = ''; // Reset file input
}

// インポート済みポイントリストのクリック処理
function handleImportedListClick(e) {
    const target = e.target.closest('button, div[data-index]');
    if (!target) return;

    const index = parseInt(target.dataset.index);
    if (target.classList.contains('toggle-visibility-btn')) {
        togglePointVisibility(index, 'imported');
    } else { // DIV領域は目標設定用
        const point = importedPoints[index];
        if (point) handleSetTargetFromImport(point);
    }
}

// --- 座標誘導関連のロジック ---

// 手動入力による目標設定
function handleSetTargetManual() {
    let lat, lon;
    if (manualInputMode === 'latlon') {
        lat = parseFloat(dom.targetLatInput.value);
        lon = parseFloat(dom.targetLonInput.value);
        if (isNaN(lat) || isNaN(lon)) {
            showAlert("有効な緯度と経度を入力してください。", "入力エラー");
            return;
        }
    } else { // xy mode
        const y = parseFloat(dom.targetYInput.value); // Easting
        const x = parseFloat(dom.targetXInput.value); // Northing
        const zone = dom.manualXyCoordSystemSelect.value;
        if (isNaN(x) || isNaN(y)) {
            showAlert("有効なXY座標を入力してください。", "入力エラー");
            return;
        }
        const latLon = convertToLatLon(x, y, zone);
        lat = latLon.lat;
        lon = latLon.lon;
    }
    handleSetTarget({lat, lon, name: "手動設定目標"});
}

// インポートしたポイントからの目標設定
function handleSetTargetFromImport(point) {
    dom.targetLatInput.value = point.lat.toFixed(8);
    dom.targetLonInput.value = point.lon.toFixed(8);
    handleSetTarget(point);
}

// 実際に目標を設定する共通処理
function handleSetTarget(point) {
    const targetLatLng = [point.lat, point.lon];
    if (!targetMarker) {
        targetMarker = createTargetMarker(point.lat, point.lon, point.name || '目標地点', 'red');
        targetCircle = L.circle(targetLatLng, { radius: 1, color: 'red', weight: 2, fillOpacity: 0.1 }).addTo(map);
    } else {
        targetMarker.setLatLng(targetLatLng);
        targetCircle.setLatLng(targetLatLng);
    }
    targetMarker.bindPopup(`<b>${point.name || '目標地点'}</b>`).openPopup();

    if(currentPosition) {
        map.fitBounds([currentUserMarker.getLatLng(), targetLatLng], { padding: [50, 50] });
    } else {
        map.setView(targetLatLng, 18);
    }

    showNavigationInfo(); // UI更新
    updateNavigationInfo();
}


// --- データ永続化 (localStorage) ---
const STORAGE_KEY = 'yamabato_survey_data_v2';

function saveData() {
    const settings = {
        currentSystem: dom.currentCoordSystemSelect.value,
        exportSystem: dom.exportCoordSystemSelect.value,
        importSystem: dom.importCoordSystemSelect.value,
        manualSystem: dom.manualXyCoordSystemSelect.value,
    };

    const dataToSave = {
        settings: settings,
        recorded: recordedPoints.map(p => ({
            name: p.name, lat: p.lat, lon: p.lon, acc: p.acc,
            status: p.status, timestamp: p.timestamp, isVisible: p.isVisible
        })),
        imported: importedPoints.map(p => ({
            name: p.name, lat: p.lat, lon: p.lon, isVisible: p.isVisible
        }))
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
        console.error("データの保存に失敗しました:", e);
        showAlert("データの保存に失敗しました。ストレージの空き容量が不足している可能性があります。", "エラー");
    }
}

function loadData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return;

    try {
        const parsedData = JSON.parse(savedData);
        
        if (parsedData.settings) {
            dom.currentCoordSystemSelect.value = parsedData.settings.currentSystem || '3';
            dom.exportCoordSystemSelect.value = parsedData.settings.exportSystem || '3';
            dom.importCoordSystemSelect.value = parsedData.settings.importSystem || '3';
            dom.manualXyCoordSystemSelect.value = parsedData.settings.manualSystem || '3';
        }

        if (parsedData.recorded) {
            recordedPoints = parsedData.recorded.map(p => {
                const marker = L.marker([p.lat, p.lon])
                    .bindPopup(`<b>${p.name}</b><br>緯度: ${p.lat.toFixed(6)}<br>経度: ${p.lon.toFixed(6)}`);
                if (p.isVisible !== false) { // Default to visible
                    marker.addTo(map);
                }
                return { ...p, marker, isVisible: p.isVisible !== false };
            });
        }

        if (parsedData.imported) {
             importedPoints = parsedData.imported.map(p => {
                const marker = createTargetMarker(p.lat, p.lon, `${p.name} (インポート)`, 'orange');
                 if (p.isVisible !== false) {
                     marker.addTo(map);
                 }
                return { ...p, marker, isVisible: p.isVisible !== false };
            });
        }

        updatePointList();
        updateImportedPointList();
        updateCurrentXYDisplay();

    } catch (e) {
        console.error("データの読み込みに失敗しました:", e);
        showAlert("保存されたデータの読み込みに失敗しました。データが破損している可能性があります。", "エラー");
    }
}
        
function deleteAllData() {
    // マーカーを地図から削除
    recordedPoints.forEach(p => p.marker && map.removeLayer(p.marker));
    importedPoints.forEach(p => p.marker && map.removeLayer(p.marker));

    // 配列をリセット
    recordedPoints = [];
    importedPoints = [];

    localStorage.removeItem(STORAGE_KEY); // localStorageから削除

    // UIを更新
    updatePointList();
    updateImportedPointList();
    clearNavigation();
    
    hideModal(dom.deleteAllConfirmModal);
    showAlert("すべてのデータが削除されました。");
}

// --- Gemini API 関連 ---

async function callGeminiAPI(prompt) {
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 1.0, maxOutputTokens: 2048 }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "AIからの応答がありませんでした。";
    } catch (error) {
        console.error("Gemini API call failed:", error);
        showAlert(`AIの呼び出し中にエラー: ${error.message}`, "APIエラー");
        return null;
    }
}

async function handleSuggestName() {
    toggleSpinner(dom.suggestNameBtn, true); // スピナー表示
    const prompt = `これは山岳地での測量アプリです。記録する測点名のデフォルトは「ポイント ${recordedPoints.length + 1}」です。簡潔で実用的な測量点名を3つ提案してください。例:「No.${recordedPoints.length + 1}」「測点${recordedPoints.length + 1}」。提案のみを改行区切りで回答してください。`;
    
    try {
        const suggestion = await callGeminiAPI(prompt);
        if (suggestion) {
            const firstSuggestion = suggestion.split('\n')[0].replace(/[-* ]/g, '');
            dom.pointNameInput.value = firstSuggestion;
        }
    } finally {
        toggleSpinner(dom.suggestNameBtn, false, '✨ AI提案'); // スピナー非表示
    }
}

async function handleGenerateReport() {
    showReportModal(true); // スピナー付きでモーダル表示
    const date = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const pointsSummary = recordedPoints.map(p => {
        const time = new Date(p.timestamp).toLocaleTimeString('ja-JP');
        return `  - ${time}: ${p.name} (緯度:${p.lat.toFixed(6)}, 経度:${p.lon.toFixed(6)}, 精度:${p.acc.toFixed(1)}m, 状態:${p.status})`;
    }).join('\n');
    
    const prompt = `あなたは建設コンサルタントです。以下の測量データに基づき、プロフェッショナルな作業日報をMarkdown形式で作成してください。
# 作業情報
- 件名: 送電線ルート測量作業
- 作業日: ${date}
- 天候: 晴れ
- 作業員: 鈴木、田中
# 記録済みポイント (${recordedPoints.length}点)
${pointsSummary}
# 指示
上記情報から、1.作業概要, 2.作業内容, 3.所感・特記事項 を含む簡潔な作業日報を作成してください。`;
    
    const reportText = await callGeminiAPI(prompt);
    showReportModal(false, reportText); // 結果を表示
}

