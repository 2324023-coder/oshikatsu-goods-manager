/**
 * GOODS管理システム - フロントエンドコアロジック（テーマカラー連動版）
 */

let allSettings = [];      
let currentSettings = {};   
let globalAssets = [];      

async function initApp() {
    try {
        const settingsResponse = await fetch('/api/settings');
        allSettings = await settingsResponse.json();
        
        if (allSettings && allSettings.length > 0) {
            switchArtist(allSettings[0].group_name);
        } else {
            document.title = "GOODS管理システム";
            document.getElementById('appTitle').textContent = "GOODS管理システム";
            document.getElementById('appSubtitle').textContent = "上部のボタンから管理対象のオブジェクト（アーティスト等）を追加してください。";
            renderNavTabs();
        }
    } catch (error) {
        console.error('アプリケーションの初期化に失敗しました:', error);
    }
}

async function switchArtist(groupName) {
    const target = allSettings.find(g => g.group_name === groupName);
    if (!target) return;
    
    currentSettings = target;
    
    document.title = `${currentSettings.group_name} 管理システム`;
    document.getElementById('appTitle').textContent = `${currentSettings.group_name} 管理システム`;
    document.getElementById('appSubtitle').textContent = `${currentSettings.group_name}のコレクションをスマートに一元管理`;
    document.getElementById('hiddenGroupField').value = currentSettings.group_name;
    
    // 💋 選択されたテーマカラーをシステム全体のUI要素に適用
    applyThemeColor();
    
    renderNavTabs();
    initDynamicSelects();
    await fetchAssets();
}

/**
 * 💋 設定されたテーマカラーを各DOM要素へ動的にバインドする処理
 */
function applyThemeColor() {
    const color = currentSettings.theme_color || '#7ec4ea'; // デフォルトは空色
    
    // ヘッダー背景色、登録ボタン、アップロードボタンの背景色変更
    document.getElementById('appHeader').style.backgroundColor = color;
    document.getElementById('submitBtn').style.backgroundColor = color;
    document.getElementById('uploadBtn').style.backgroundColor = color;
    
    // 件数バッジの配色調整（背景は不透明度10%のライトカラー、文字はテーマカラー）
    const badge = document.getElementById('assetCount');
    badge.style.backgroundColor = `${color}1a`; // HEXコード末尾に1aを付加し透過度約10%に設定
    badge.style.color = color;
    
    // フォーム入力欄のフォーカス時の挙動をCSS変数等を用いて動的に制御
    const inputs = document.querySelectorAll('.focus-ring-target');
    inputs.forEach(input => {
        input.addEventListener('focus', () => { input.style.borderColor = color; input.style.boxShadow = `0 0 0 2px ${color}33`; });
        input.addEventListener('blur', () => { input.style.borderColor = ''; input.style.boxShadow = ''; });
    });
}

function renderNavTabs() {
    const nav = document.querySelector('.nav-links');
    nav.innerHTML = '';
    
    const color = currentSettings.theme_color || '#7ec4ea';
    
    allSettings.forEach(g => {
        const a = document.createElement('a');
        a.href = "#";
        a.textContent = g.group_name;
        if (g.group_name === currentSettings.group_name) {
            a.className = "active";
            // 💋 アクティブなタブの文字色を現在のテーマカラーにコンポジションします
            a.style.color = color;
        } else {
            a.className = "";
            a.style.color = "white";
            a.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
        }
        a.addEventListener('click', (e) => {
            e.preventDefault();
            switchArtist(g.group_name);
        });
        nav.appendChild(a);
    });
    
    const setLink = document.createElement('a');
    setLink.href = "/settings";
    setLink.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
    setLink.style.color = "white";
    setLink.textContent = "⚙️ アーティスト管理設定";
    nav.appendChild(setLink);
}

function initDynamicSelects() {
    const filterSelect = document.getElementById('memberFilter');
    const formSelect = document.getElementById('memberFormSelect');
    const categoryFilter = document.getElementById('categoryFilter');
    const categorySelect = document.getElementById('categorySelect');
    
    filterSelect.innerHTML = '<option value="ALL">全員表示</option>';
    formSelect.innerHTML = '<option value="">メンバーを選択してください</option>';
    if (currentSettings.members) {
        currentSettings.members.forEach(member => {
            filterSelect.appendChild(new Option(member, member));
            formSelect.appendChild(new Option(member, member));
        });
        filterSelect.appendChild(new Option("全体・その他", "全体・その他"));
        formSelect.appendChild(new Option("全体・その他", "全体・その他"));
    }

    categoryFilter.innerHTML = '<option value="ALL">すべて表示</option>';
    categorySelect.innerHTML = '';
    if (currentSettings.categories) {
        currentSettings.categories.forEach(cat => {
            categoryFilter.appendChild(new Option(cat, cat));
            categorySelect.appendChild(new Option(cat, cat));
        });
    }
}

async function fetchAssets() {
    try {
        const groupParam = encodeURIComponent(currentSettings.group_name);
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/assets?group=${groupParam}&_=${cacheBuster}`);
        globalAssets = await response.json();
        filterAssets();
    } catch (error) {
        console.error('資産データの取得に失敗しました:', error);
    }
}

function renderAssets(assets) {
    const grid = document.getElementById('assetGrid');
    grid.innerHTML = '';
    
    const color = currentSettings.theme_color || '#7ec4ea';
    
    if (assets.length === 0) {
        grid.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-slate-400 py-12 bg-white rounded-2xl border border-slate-200">登録されているGOODSが見つかりません。</div>';
        return;
    }
    
    assets.forEach(asset => {
        const photoHtml = asset.photo_path 
            ? `<img src="${asset.photo_path}" alt="グッズ画像" class="w-full h-48 object-cover cursor-zoom-in hover:opacity-90 transition" onclick="openImageModal('${asset.photo_path}')">`
            : `<div class="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-300 text-sm">画像なし</div>`;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition';
        card.innerHTML = `
            ${photoHtml}
            <div class="p-4 relative">
                <div class="absolute top-0 right-0 transform translate-x-2 -translate-y-4">
                    <span class="text-[10px] font-bold px-2 py-1 rounded-full border" style="background-color: ${color}1a; color: ${color}; border-color: ${color}4d;">${asset.category}</span>
                </div>
                <h3 class="font-bold text-slate-800 mb-1 pr-16 line-clamp-2">${asset.item_name}</h3>
                <p class="text-sm text-slate-500 font-bold mb-3 border-b pb-2">👤 ${asset.member_name}</p>
                <div class="space-y-1.5 text-xs text-slate-600">
                    <p class="flex items-center gap-2"><span class="w-4 text-center">📍</span> 保管場所: ${asset.location}</p>
                    <p class="flex items-center gap-2"><span class="w-4 text-center">✨</span> 状態: ${asset.status}</p>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="editAsset('${asset.asset_id}')" class="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 transition font-bold">✏️ 編集</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateCount(count) { 
    document.getElementById('assetCount').textContent = `${count} 件のデータ`; 
}

function filterAssets() {
    const keyword = document.getElementById('keywordSearch').value.toLowerCase();
    const member = document.getElementById('memberFilter').value;
    const category = document.getElementById('categoryFilter').value;
    
    const filtered = globalAssets.filter(asset => {
        const matchKeyword = asset.item_name.toLowerCase().includes(keyword) || asset.location.toLowerCase().includes(keyword);
        const matchMember = member === 'ALL' || asset.member_name === member;
        const matchCategory = category === 'ALL' || asset.category === category;
        return matchKeyword && matchMember && matchCategory;
    });
    renderAssets(filtered);
    updateCount(filtered.length);
}

document.getElementById('keywordSearch').addEventListener('input', filterAssets);
document.getElementById('memberFilter').addEventListener('change', filterAssets);
document.getElementById('categoryFilter').addEventListener('change', filterAssets);

document.getElementById('assetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.set('group', currentSettings.group_name);
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = '処理中...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/assets', { method: 'POST', body: formData });
        if (response.ok) {
            e.target.reset();
            document.getElementById('fileNameDisplay').textContent = 'ファイルを選択してください';
            document.getElementById('editAssetId').value = '';
            document.getElementById('formTitle').textContent = ' GOODS新規登録';
            document.getElementById('cancelEditBtn').classList.add('hidden');
            await fetchAssets();
        }
    } catch (error) {
        console.error('データの送信に失敗しました:', error);
        alert('保存処理に失敗しました。');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '登録';
        applyThemeColor(); // ボタン色を再固定します
    }
});

document.getElementById('photoInput').addEventListener('change', (e) => {
    const display = document.getElementById('fileNameDisplay');
    display.textContent = e.target.files.length > 0 ? e.target.files[0].name : 'ファイルを選択してください';
});

window.editAsset = function(assetId) {
    const asset = globalAssets.find(a => a.asset_id === assetId);
    if (!asset) return;
    
    document.getElementById('editAssetId').value = asset.asset_id;
    document.getElementById('memberFormSelect').value = asset.member_name;
    document.getElementById('itemNameInput').value = asset.item_name;
    document.getElementById('categorySelect').value = asset.category;
    document.getElementById('statusSelect').value = asset.status;
    document.getElementById('locationInput').value = asset.location;
    
    document.getElementById('formTitle').textContent = `✏️ 編集: ${asset.asset_id}`;
    document.getElementById('submitBtn').textContent = '情報を更新';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('assetForm').reset();
    document.getElementById('editAssetId').value = '';
    document.getElementById('formTitle').textContent = ' GOODS新規登録';
    document.getElementById('submitBtn').textContent = '登録';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    applyThemeColor();
});

const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
window.openImageModal = function(src) {
    modalImg.src = src;
    modal.classList.remove('opacity-0', 'pointer-events-none');
}
modal.addEventListener('click', () => {
    modal.classList.add('opacity-0', 'pointer-events-none');
});

initApp();