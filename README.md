# B-Qtrans — kho tiện ích dịch cho vBook

Tiện ích dịch của vBook: dịch truyện Trung sang tiếng Việt bằng model gọi qua Cedric Web (API chuẩn OpenAI,
`/v1/chat/completions`). Đây là bản phát hành của Q-trans 3; repo này chỉ tồn tại để vBook **tự cập nhật** được,
không phải nơi phát triển.

Tên và id ở đây (`B-Qtrans` / `b-qtrans`) **khác** bản nhập bằng file zip (`Q-trans 3 (Cedric)` / `qtrans3-cedric`),
nên hai bản cài song song được, mỗi bản có cài đặt và bộ nhớ riêng — tiện để so sánh. Icon màu xanh lá để phân biệt.

## Cài và cập nhật trong vBook

1. Copy URL kho: `https://raw.githubusercontent.com/Thanklog08/qtrans3-vbook/main/plugin.json`
2. vBook › **Cài đặt** › **Phần mở rộng** › **⋮** › **Kho lưu trữ** › **+**, dán URL.
3. Quay lại danh sách, tìm **B-Qtrans**, bấm tải.
4. Bản sau chỉ cần mở lại danh sách: version trong `plugin.json` tăng thì vBook hiện mục **Cập nhật**, bấm một lần là xong và **giữ nguyên cài đặt đã lưu** (đã kiểm trên vBook 1.0).

Bản nhập từ file zip mang badge DEV và **không** nhận cập nhật từ kho — muốn dùng đường kho thì cài bản này.
Xoá một tiện ích là mất luôn cài đặt đã lưu của nó.

## Phải tự nhập sau khi cài

| Ô trong Settings của tiện ích | Ghi chú |
| --- | --- |
| **Kết nối · Địa chỉ Cedric Web** | Bắt buộc, để trống trong repo công khai. Không có `/v1` ở cuối. |
| **Kết nối · Khoá Cedric** | `CEDRIC_API_KEY` của máy chủ bạn. Nhiều khoá thì xoay vòng. |
| **Kết nối · Model** | Mặc định `antigravity-gemini-3.6-flash-high`. Trình đọc iPhone bỏ lượt sau ~30 giây nên đừng chọn model chậm (gpt/sonnet) khi đọc trực tiếp. |
| **Dịch · Văn phong mặc định** | `auto` = tự nhận thể loại theo chữ Hán của chương, cộng dồn theo từng truyện. |

Tiện ích không chứa khoá nào: `src/apikey.js` không bao giờ được đóng gói.

## Kỳ Huyễn (Cedric)

Bản sửa tiện ích "Dịch truyện tự động từ Qidian" của Đường đen (`duongden/vbook`, bản 3), nằm ở `extensions/kyhuyen/`.
Cùng kho ở trên, trong danh sách tìm **Kỳ Huyễn (Cedric)** (bản 4–5 tên là "Kỳ Huyễn (Dịch tự động từ Qidian)").

- Trang `q.kyhuyen.com` đã ngừng (mọi đường dẫn trả 404); bản này dùng `kyhuyen.com`, link cũ tự đổi sang tên miền mới.
- Chương: bỏ watermark ẩn (`<span class="d-none">`, link `KyHuyen.com` kèm dấu chấm đầu dòng, cả chương dạng `<p>` lẫn `<br>`) và quảng cáo chèn giữa bài.
- Mục lục: bỏ tab "10 chương mới nhất" xếp ngược nên không còn chương lặp và sai thứ tự ở đầu.
- Danh mục (Mới cập nhật, Đọc nhiều…) và 16 thể loại theo bộ lọc của trang mới; tên truyện không còn dính nhãn "WIKI"/"TTV".
- Tên tác giả viết hoa đầu mỗi chữ ("Khách Sơn Thanh Lộc" thay vì "Khách sơn thanh lộc") ở danh sách và chi tiết.

Mã nguồn phát triển: `vbook-ext/extensions/kyhuyen-bbook`; đóng gói bằng `python tools/build_ext.py` của repo đó.

## Cập nhật repo này từ bản phát triển

Mã nguồn thật nằm trong repo phát triển (`vbook-ext/extensions/qtrans3-cedric`). Để đẩy bản mới:

```
python tools/sync_from_dev.py                    # hoặc: python tools/sync_from_dev.py <đường dẫn ext>
git add -A && git commit -m "B-Qtrans v<N>" && git push
```

`sync_from_dev.py` chép `plugin.json` + `src/*.js`, đổi `metadata.name`/`id` sang B-Qtrans/b-qtrans, xoá trắng ô Địa
chỉ Cedric, dựng lại `plugin.zip` và đồng bộ `version` trong kho. Nó **không** chép `icon.png` (icon ở đây đã đổi
màu). Tự sửa file ở đây rồi quên bên kia thì lần sync sau bị ghi đè.
