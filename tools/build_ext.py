"""Đóng gói một tiện ích vBook thành plugin.zip, dựng lại cho ra đúng từng byte.

    python tools/build_ext.py extensions/qtrans3-cedric            # ghi extensions/qtrans3-cedric/plugin.zip
    python tools/build_ext.py extensions/qtrans3-cedric -o out.zip

Gói gồm plugin.json, icon.png (nếu có) và mọi file trong src/ (sắp theo tên). Không bao giờ đóng gói src/apikey.js
hay file có chữ "secret"/".env": khoá do người dùng nhập ở Settings của tiện ích trong vBook.
"""
import argparse
import json
import os
import sys
import zipfile

FIXED_TIME = (2026, 1, 1, 0, 0, 0)
FORBIDDEN = ("apikey.js", ".env")


def add(zf, arcname, path):
    info = zipfile.ZipInfo(arcname, FIXED_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    with open(path, "rb") as f:
        zf.writestr(info, f.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ext_dir")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()

    ext = a.ext_dir.rstrip("/\\")
    with open(os.path.join(ext, "plugin.json"), encoding="utf-8") as f:
        plugin = json.load(f)
    src_dir = os.path.join(ext, "src")
    files = sorted(n for n in os.listdir(src_dir) if os.path.isfile(os.path.join(src_dir, n)))
    bad = [n for n in files if n in FORBIDDEN or "secret" in n.lower()]
    files = [n for n in files if n not in bad]
    if bad:
        print("Bỏ qua (có thể chứa khoá):", ", ".join(bad), file=sys.stderr)
    missing = [s for s in plugin.get("script", {}).values() if s not in files]
    if missing:
        sys.exit("plugin.json khai script không có trong src/: %s" % missing)

    out = a.out or os.path.join(ext, "plugin.zip")
    with zipfile.ZipFile(out, "w") as zf:
        add(zf, "plugin.json", os.path.join(ext, "plugin.json"))
        if os.path.exists(os.path.join(ext, "icon.png")):
            add(zf, "icon.png", os.path.join(ext, "icon.png"))
        for n in files:
            add(zf, "src/" + n, os.path.join(src_dir, n))
    print("%s: %d byte, version %s, %d script" % (out, os.path.getsize(out), plugin["metadata"].get("version"), len(files)))


if __name__ == "__main__":
    main()
