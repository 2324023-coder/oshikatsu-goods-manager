import os
import json
import webbrowser
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'item_photos')
JSON_FILE = os.path.join(BASE_DIR, 'goods_master.json')
SETTINGS_FILE = os.path.join(BASE_DIR, 'settings.json')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [{
        "group_name": "日向坂46",
        "members": ["メンバー1"],
        "categories": ["カテゴリ1"]
    }]

def save_settings(data):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_assets():
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_assets(data):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def handle_photo_upload(file, asset_id):
    if not file or file.filename == '':
        return None
    
    # 拡張子を安全に取得
    from werkzeug.utils import secure_filename
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    
    # ファイル名を「資産ID + 拡張子」で統一して保存（上書き対策）
    saved_name = f"{asset_id}{ext}"
    final_path = os.path.join(app.config['UPLOAD_FOLDER'], saved_name)
    
    # 既存の同名ファイルがあれば削除
    if os.path.exists(final_path):
        os.remove(final_path)
        
    file.save(final_path)
    
    # ※ GitHub公開用にMac専用の外部変換コマンド(sips)は廃止したわ。
    # もしiPhoneのHEIC画像をどうしても自動変換したい場合は、
    # サーバーに `pip install pillow pyheif` を入れてPillowで処理するのが世界標準よ。
    return f"/static/item_photos/{saved_name}"

# --- 🛡️ 鉄壁のエラーハンドラ ---
@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({
        "success": False, 
        "message": "システムエラーが発生しました。時間を置いて再度お試しいただくか、管理者に連絡してください。"
    }), 500

@app.errorhandler(404)
def page_not_found(e):
    return jsonify({
        "success": False,
        "message": "指定されたページが見つかりません。"
    }), 404

# --- ルーティング ---
@app.route('/')
def index(): 
    return render_template('index.html')

@app.route('/settings')
def settings_page(): 
    return render_template('settings.html')

# --- API ---
@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(load_settings())

@app.route('/api/settings', methods=['POST'])
def update_settings():
    new_group = request.json
    settings_list = load_settings()
    
    updated = False
    for i, g in enumerate(settings_list):
        if g['group_name'] == new_group['group_name']:
            settings_list[i] = new_group
            updated = True
            break
    if not updated:
        settings_list.append(new_group)
        
    save_settings(settings_list)
    return jsonify({"success": True})

@app.route('/api/settings/delete', methods=['POST'])
def delete_settings():
    target_group = request.json.get('group_name')
    settings_list = load_settings()
    
    new_settings = [g for g in settings_list if g['group_name'] != target_group]
    save_settings(new_settings)
    
    assets = load_assets()
    new_assets = [asset for asset in assets if asset.get('group') != target_group]
    save_assets(new_assets)
    
    return jsonify({"success": True})

@app.route('/api/assets', methods=['GET'])
def get_assets():
    assets = load_assets()
    group_filter = request.args.get('group')
    if group_filter:
        assets = [asset for asset in assets if asset.get('group') == group_filter]
    return jsonify(assets)

@app.route('/api/assets', methods=['POST'])
def add_asset():
    assets = load_assets()
    edit_id = request.form.get('edit_asset_id')

    if edit_id:
        target_asset = None
        for asset in assets:
            if asset['asset_id'] == edit_id:
                target_asset = asset
                break
        if not target_asset: 
            return jsonify({"success": False, "message": "対象の資産IDが見つかりません"}), 404

        target_asset['group'] = request.form.get('group')
        target_asset['member_name'] = request.form.get('member_name')
        target_asset['item_name'] = request.form.get('item_name')
        target_asset['category'] = request.form.get('category')
        target_asset['status'] = request.form.get('status')
        target_asset['location'] = request.form.get('location')

        if 'photo' in request.files and request.files['photo'].filename != '':
            new_path = handle_photo_upload(request.files['photo'], edit_id)
            if new_path: 
                target_asset['photo_path'] = new_path

        target_asset['meta_data']['updated_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save_assets(assets)
        return jsonify({"success": True, "asset_id": edit_id, "action": "update"}), 200

    else:
        if assets:
            try:
                last_id = assets[-1].get("asset_id", "GDS-0000")
                last_num = int(last_id.split("-")[1])
                asset_id = f"GDS-{last_num + 1:04d}"
            except:
                asset_id = f"GDS-{len(assets) + 1:04d}"
        else:
            asset_id = "GDS-0001"

        group = request.form.get('group')
        member_name = request.form.get('member_name')
        item_name = request.form.get('item_name')
        category = request.form.get('category')
        status = request.form.get('status')
        location = request.form.get('location')
        
        photo_path = ""
        if 'photo' in request.files and request.files['photo'].filename != '':
            photo_path = handle_photo_upload(request.files['photo'], asset_id) or ""

        new_asset = {
            "asset_id": asset_id,
            "group": group,
            "member_name": member_name,
            "item_name": item_name,
            "category": category,
            "status": status,
            "location": location,
            "photo_path": photo_path,
            "meta_data": {"created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        }
        assets.append(new_asset)
        save_assets(assets)
        return jsonify({"success": True, "asset_id": asset_id, "action": "create"}), 201

if __name__ == '__main__':
    # 通常開発時・GitHub公開用：自分のPCからのみ安全にアクセス可能
    app.run(debug=True, host='127.0.0.1', port=5001)
    
    # 👥 発表会当日など、他の人のPCからアクセスさせたい時は上の行をコメントアウトして、
    # 下の行のコメントアウト（#）を外して実行してね！
    # app.run(debug=False, host='0.0.0.0', port=5001)