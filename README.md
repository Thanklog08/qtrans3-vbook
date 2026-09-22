# Q-trans 3 (Cedric) — kho tiện ích cho vBook

Tiện ích dịch của vBook: dịch truyện Trung sang tiếng Việt bằng model gọi qua [Cedric Web](https://github.com/) (API chuẩn OpenAI, `/v1/chat/completions`). Repo này chỉ tồn tại để vBook **tự cập nhật** được, không phải nơi phát triển.

## Cài và cập nhật trong vBook

1. Copy URL kho: `https://raw.githubusercontent.com/Thanklog08/qtrans3-vbook/main/plugin.json`
2. vBook › **Cài đặt** › **Kho tiện ích** › **Thêm kho**, dán URL.
3. Làm mới danh sách, cài **Q-trans 3 (Cedric)**.
4. Bản sau chỉ cần làm mới kho: version trong `plugin.json` tăng thì vBook hiện nút cập nhật. Giá trị đã lưu ở Settings được giữ vì `metadata.id` không đổi.

## Phải tự nhập sau khi cài

| Ô trong Settings của tiện ích | Ghi chú |
| --- | --- |
| **Kết nối · Địa chỉ Cedric Web** | Bắt buộc, để trống trong repo công khai. Không có `/v1` ở cuối. |
| **Kết nối · Khoá Cedric** | `CEDRIC_API_KEY` của máy chủ bạn. Nhiều khoá thì xoay vòng. |
| **Kết nối · Model** | Mặc định `antigravity-gemini-3.6-flash-high`. Trình đọc iPhone bỏ lượt sau ~30 giây nên đừng chọn model chậm (gpt/sonnet) khi đọc trực tiếp. |
| **Dịch · Văn phong mặc định** | `auto` = tự nhận thể loại theo chữ Hán của chương, cộng dồn theo từng truyện. |

Tiện ích không chứa khoá nào: `src/apikey.js` không bao giờ được đóng gói.

## Cập nhật repo này từ bản phát triển

Mã nguồn thật nằm trong repo phát triển (`vbook-ext/extensions/qtrans3-cedric`). Để đẩy bản mới:

```
python tools/sync_from_dev.py                    # hoặc: python tools/sync_from_dev.py <đường dẫn ext>
git add -A && git commit -m "Q-trans 3 v<N>" && git push
```

`sync_from_dev.py` chép `plugin.json`, `icon.png`, `src/*.js`, xoá trắng ô Địa chỉ Cedric, dựng lại `plugin.zip` và đồng bộ `version` trong kho. Tự sửa file ở đây rồi quên bên kia thì lần sync sau bị ghi đè.
