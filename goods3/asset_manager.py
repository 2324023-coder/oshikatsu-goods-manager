import json
import os
from datetime import datetime

# 保存するファイル名
JSON_FILE = "goods_master.json"

def load_assets():
    """既存のJSONデータを読み込む（ファイルがなければ空のリストを返す）"""
    if os.path.exists(JSON_FILE):
        try:
            with open(JSON_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            print("【警告】JSONファイルの読み込みに失敗しました。新しく作成します。")
            return []
    return []

def save_assets(assets):
    """データをJSONファイルに綺麗に（インデント付きで）保存する"""
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(assets, f, ensure_ascii=False, indent=2)

def generate_asset_id(assets):
    """自動で GDS-0001, GDS-0002 ... とIDを採番する"""
    if not assets:
        return "GDS-0001"
    
    # 最後の資産のIDから数値を抽出して+1する
    last_id = assets[-1].get("asset_id", "GDS-0000")
    try:
        last_num = int(last_id.split("-")[1])
        return f"GDS-{last_num + 1:04d}"
    except (IndexError, ValueError):
        return f"GDS-{len(assets) + 1:04d}"

def input_form():
    print("=" * 40)
    print(" 🌸 推し活資産管理システム - 入力フォーム 🌸")
    print("=" * 40)
    
    # 既存データの読み込みとIDの自動採番
    assets = load_assets()
    asset_id = generate_asset_id(assets)
    print(f"▶ 採番された資産ID: {asset_id}")
    
    # ユーザーからの入力受付
    item_name = input("1. グッズ名（例: 黒ドレス衣装 小坂菜緒）: ").strip()
    category = input("2. カテゴリ（例: アクリルスタンド / 生写真）: ").strip()
    status = input("3. ステータス（例: 展示中 / 保管中）: ").strip()
    location = input("4. 保管ロケーション（例: デスクの上）: ").strip()
    
    # 入力されたデータを構造化（辞書型）
    new_asset = {
        "asset_id": asset_id,
        "item_name": item_name,
        "category": category,
        "status": status,
        "location": location,
        "meta_data": {
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }
    
    # データの追加と保存
    assets.append(new_asset)
    save_assets(assets)
    
    print("\n" + "=" * 40)
    print(f"✨ 資産ID [{asset_id}] の登録が完了しました！ ✨")
    print("=" * 40)

if __name__ == "__main__":
    input_form()