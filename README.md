# B-Qtrans — kho tiện ích vBook

Kho tiện ích cho vBook: tiện ích dịch **B-Qtrans** và vài nguồn đọc truyện. Repo chỉ chứa gói đã đóng (`plugin.zip`) để vBook
cài và tự cập nhật.

## Cài và cập nhật

1. Copy URL kho: `https://raw.githubusercontent.com/Thanklog08/qtrans3-vbook/main/plugin.json`
2. vBook › **Cài đặt** › **Phần mở rộng** › **⋮** › **Kho lưu trữ** › **+**, dán URL.
3. Quay lại danh sách, tìm tên tiện ích, bấm tải.
4. Có bản mới: mở lại danh sách, bấm **Cập nhật** — cài đặt đã lưu giữ nguyên. Xoá tiện ích là mất cài đặt của nó.

## Tiện ích

| Tiện ích | Loại | Ghi chú |
| --- | --- | --- |
| **B-Qtrans** | Dịch Trung → Việt | Dịch qua Cedric Web (API chuẩn OpenAI). Phải tự nhập trong cài đặt tiện ích: **Địa chỉ Cedric Web** (không có `/v1` ở cuối), **Khoá Cedric**, **Model**. Tiện ích không chứa khoá nào. |
| **Kỳ Huyễn (Cedric)** | Nguồn tiếng Việt | Đọc truyện trên kyhuyen.com (trang cũ q.kyhuyen.com đã ngừng). |
| **Tàng Thư Viện (Cedric)** | Nguồn tiếng Việt | Đọc truyện trên tangthuvien.org. Truyện độc quyền dịch chỉ mở khoảng 100 chương đầu trên web; tiện ích không vượt khoá. |
| **Truyencom (Cedric)** | Nguồn tiếng Việt | Đọc truyện trên truyencom.com. Mạng chặn trang này thì chọn `truyenhoan.com` ở ô **Tên miền** trong cài đặt. |
| **Faloo 飞卢 (Cedric)** | Nguồn tiếng Trung | Đọc truyện trên wap.faloo.com. Phần lớn truyện là VIP: chỉ đọc được vài chục chương đầu. |
| **Sói Xám 大灰狼 (Cedric)** | Nguồn tiếng Trung | Đọc Cà Chua (Fanqie), Thất Miêu (Qimao), QQ Đọc Sách… qua máy chủ Sói Xám. Khám phá theo bảng xếp hạng Fanqie; Thể loại có "Cà Chua" và "Nguồn khác" cho từng mục; **ô tìm kiếm lọc được hơn 370 thể loại bằng tiếng Việt không dấu** (vd. `tu tien`, `trong sinh`; thêm `@khac` để tìm ở nguồn khác); trang truyện có "Cùng tác giả". **Khách chỉ đọc 3 chương mỗi ngày**: nhập email + mật khẩu (hoặc token) Sói Xám trong cài đặt tiện ích để đọc tiếp. |

Nguồn tiếng Trung dùng kèm một tiện ích dịch (B-Qtrans hoặc tiện ích khác).

## Nguồn và ghi công

- Bộ công cụ phát triển và khuôn tiện ích: [dat-bi/ext-vbook](https://github.com/dat-bi/ext-vbook).
- **B-Qtrans**: phát triển tiếp từ tiện ích dịch Q-trans 2 của cộng đồng vBook, dùng bộ từ điển Quick Translator (QT).
- **Kỳ Huyễn (Cedric)**: bản sửa tiện ích "Dịch truyện tự động từ Qidian" của Đường đen ([duongden/vbook](https://github.com/duongden/vbook)).
- **Sói Xám 大灰狼 (Cedric)**: dữ liệu và API của máy chủ Sói Xám (大灰狼, langge); cách gọi API theo nguồn đọc truyện "大灰狼聚合"
  cho app Legado. Tài khoản, giới hạn đọc và nội dung do máy chủ Sói Xám quản lý.
- Nội dung truyện thuộc về tác giả và các trang/nền tảng gốc; các tiện ích chỉ hiển thị nội dung những trang đó cung cấp.
