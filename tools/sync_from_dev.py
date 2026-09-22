"""Chép tiện ích Q-trans 3 từ repo phát triển vào kho công khai này.

    python tools/sync_from_dev.py [đường dẫn tới extensions/qtrans3-cedric]

Việc nó làm: chép plugin.json, icon.png, src/*.js (bỏ apikey.js), xoá trắng ô "Địa chỉ Cedric Web" để repo công
khai không mang endpoint riêng, dựng lại plugin.zip và cập nhật version trong kho (plugin.json ở gốc).
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.environ.get("QTRANS3_DEV_EXT", os.path.join(
    os.path.dirname(HERE), "vbook-ext", "extensions", "qtrans3-cedric"))
EXT = os.path.join(HERE, "extensions", "qtrans3-cedric")
# Xoá trắng giá trị mặc định của ô địa chỉ, không viết endpoint nào vào repo công khai này.
CEDRIC_URL_DEFAULT = re.compile(r'("cedric_url_ag"\s*:\s*\{[^{}]*?"default"\s*:\s*)"[^"]*"')


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.isdir(src):
        sys.exit("không thấy thư mục nguồn: " + src)

    shutil.copy2(os.path.join(src, "icon.png"), EXT)
    shutil.copy2(os.path.join(src, "plugin.json"), EXT)
    src_dir = os.path.join(EXT, "src")
    for f in os.listdir(src_dir):
        os.remove(os.path.join(src_dir, f))
    for f in sorted(os.listdir(os.path.join(src, "src"))):
        if f == "apikey.js" or ".env" in f:
            continue
        shutil.copy2(os.path.join(src, "src", f), src_dir)

    # Endpoint riêng không đi vào bản công khai; máy đã cài vẫn giữ giá trị đã lưu.
    manifest = os.path.join(EXT, "plugin.json")
    text = io.open(manifest, encoding="utf-8").read()
    text, blanked = CEDRIC_URL_DEFAULT.subn(r'\1""', text, count=1)
    if not blanked:
        sys.exit("không tìm thấy ô cedric_url_ag để xoá trắng — kiểm plugin.json rồi chạy lại")
    text = text.replace('"subtitle": "Không có /v1 ở cuối.', '"subtitle": "BẮT BUỘC nhập. Không có /v1 ở cuối.', 1)
    if not text.endswith("\n"):
        text += "\n"
    io.open(manifest, "w", encoding="utf-8", newline="\n").write(text)

    version = json.load(io.open(manifest, encoding="utf-8"))["metadata"]["version"]
    subprocess.check_call([sys.executable, os.path.join(HERE, "tools", "build_ext.py"), EXT])

    index_path = os.path.join(HERE, "plugin.json")
    index = json.load(io.open(index_path, encoding="utf-8"))
    for entry in index["data"]:
        if entry["name"].startswith("Q-trans 3"):
            entry["version"] = version
    io.open(index_path, "w", encoding="utf-8", newline="\n").write(
        json.dumps(index, ensure_ascii=False, indent=4) + "\n")
    print("đã đồng bộ, version %s" % version)


main()
