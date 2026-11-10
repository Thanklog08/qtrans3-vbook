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
| **Tàng Thư Viện (Cedric)** | Nguồn tiếng Việt | Đọc truyện trên tangthuvien.org. Truyện độc quyền dịch chỉ mở khoảng 100 chương đầu trên web; tiện ích không vượt khoá. Mạng chặn trang này: nhập khoá thiết bị B-trans trong cài đặt để máy chủ B-trans tải hộ. |
| **Truyencom (Cedric)** | Nguồn tiếng Việt | Đọc truyện trên wetruyen.com (truyencom.com cũ chuyển sang, không bị chặn). Truyện đã lưu ở truyencom.com: nhập khoá thiết bị B-trans để máy chủ B-trans tải hộ. |
| **Faloo 飞卢 (Cedric)** | Nguồn tiếng Trung | Đọc truyện trên wap.faloo.com. Phần lớn truyện là VIP: chỉ đọc được vài chục chương đầu. |
| **Sói Xám 大灰狼 (Cedric)** | Nguồn tiếng Trung | Đọc Cà Chua (Fanqie), Thất Miêu (Qimao), QQ Đọc Sách… qua máy chủ Sói Xám. Khám phá theo bảng xếp hạng Fanqie; Thể loại liệt kê đủ danh mục Fanqie (4 phần Chính · Chủ đề · Nhân vật · Tình tiết), mỗi mục có "Cà Chua" và "Nguồn khác"; **ô tìm kiếm lọc được hơn 370 thể loại bằng tiếng Việt không dấu** (vd. `tu tien`, `trong sinh`; thêm `@khac` để tìm ở nguồn khác); trang truyện có đủ thể loại Fanqie và "Cùng tác giả". **Khách chỉ đọc 3 chương mỗi ngày**: nhập email + mật khẩu (hoặc token) Sói Xám trong cài đặt tiện ích để đọc tiếp. |

Nguồn tiếng Trung dùng kèm một tiện ích dịch (B-Qtrans hoặc tiện ích khác).

<!-- forks -->
## Nguồn fork — chỉ dùng cá nhân

Các tiện ích dưới đây **không phải của BBook**: chép nguyên từ kho của tác giả khác (cột *Fork từ*), chỉ đổi mã tiện ích (`<tên>-bbook`), ghi công và mô tả; BBook giữ lại để **dùng cá nhân, không thương mại**. Công sức thuộc tác giả gốc; tác giả muốn gỡ thì mở issue, BBook gỡ ngay. 85 Novel giữ giấy phép GPL-3.0 của bản gốc (mã nguồn nằm trong `plugin.zip`). 1qxs, idejian: bỏ đoạn liên kết sang sangtacviet có trong bản gốc.

| Tiện ích | Nhóm | Trang | Fork từ |
| --- | --- | --- | --- |
| **168txt** | Truyện mạng | www.168txt.cc | [SoulGodEve9x9/Vbook-ext](https://github.com/SoulGodEve9x9/Vbook-ext) |
| **1qxs** | Truyện mạng | www.1qxs.com | [buudvh/leech_story_ext](https://github.com/buudvh/leech_story_ext) |
| **85 Novel** | Truyện mạng | www.85novel.com | [duongden/vbook](https://github.com/duongden/vbook) |
| **bqquge** | Truyện mạng | www.bqquge.com | [buudvh/leech_story_ext](https://github.com/buudvh/leech_story_ext) |
| **[QQ] html5** | Truyện mạng | novel.html5.qq.com | [kychitoge/vbook-ext](https://github.com/kychitoge/vbook-ext) |
| **idejian** | Truyện mạng | wechat.idejian.com | [buudvh/leech_story_ext](https://github.com/buudvh/leech_story_ext) |
| **ihuaben** | Truyện mạng | www.ihuaben.com | [mizhm/vbook-extensions](https://github.com/mizhm/vbook-extensions) |
| **ixdzs.tw** | Truyện mạng | ixdzs.tw | [BaoBao666888/ext-vbook-w](https://github.com/BaoBao666888/ext-vbook-w) |
| **Qimao (七猫文化)** | Truyện mạng | www.qimao.com | [lethituyen/vbooks-extension](https://github.com/lethituyen/vbooks-extension) |
| **全本小说网** | Truyện mạng | quanben-xiaoshuo.com | [andyhoangds/andy-vbook-ext](https://github.com/andyhoangds/andy-vbook-ext) |
| **shumilou** | Truyện mạng | www.shumilouxs.com | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **sudugu** | Truyện mạng | www.sudugu.org | [buudvh/leech_story_ext](https://github.com/buudvh/leech_story_ext) |
| **tushumi.cc** | Truyện mạng | www.tushumi.cc | [BaoBao666888/ext-vbook-w](https://github.com/BaoBao666888/ext-vbook-w) |
| **uushuk** | Truyện mạng | www.uushuk.com | [dat-bi/ext-vbook](https://github.com/dat-bi/ext-vbook) |
| **52shuku** | Đồng nhân / fanfic | www.52shuku.net | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **bixiange** | Đồng nhân / fanfic | www.bixiange.top | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **ffxs8** | Đồng nhân / fanfic | www.ffxs8.com | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **fuxsb 👨‍❤️‍👨👩‍❤️‍👩** | Đồng nhân / fanfic | www.fuxsb.com | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **jpxs123** | Đồng nhân / fanfic | jpxs123.com | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **Tinh Võ Tiểu Thuyết Mạng** | Đồng nhân / fanfic | www.jwxs.org | [TuanHai03/vbook-extensions](https://github.com/TuanHai03/vbook-extensions) |
| **powanjuan** | Đồng nhân / fanfic | www.powanjuan.cc | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **qbtr** | Đồng nhân / fanfic | www.qbtr.cc | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **sjks88** | Đồng nhân / fanfic | www.sjks88.com | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **kanunu8** | Văn học, sách cũ, dịch phẩm | www.kanunu8.com | [dat-bi/ext-vbook](https://github.com/dat-bi/ext-vbook) |
| **piaoyuxuan** | Văn học, sách cũ, dịch phẩm | www.piaoyuxuan.com | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **Xbanxia** | Văn học, sách cũ, dịch phẩm | www.xbanxia.com | [B3x0m/vbook-ext](https://github.com/B3x0m/vbook-ext) |
| **book18** | 18+ | www.book18.org | [SoulGodEve9x9/Vbook-ext](https://github.com/SoulGodEve9x9/Vbook-ext) |
| **h528** | 18+ | www.h528.com | [SoulGodEve9x9/Vbook-ext](https://github.com/SoulGodEve9x9/Vbook-ext) |
| **po18gv** | 18+ | www.po18gv.vip | [Moleys/vbook-ext](https://github.com/Moleys/vbook-ext) |
| **sinodan** | 18+ | www.sinodan.link | [SoulGodEve9x9/Vbook-ext](https://github.com/SoulGodEve9x9/Vbook-ext) |
| **xinyushuwu** | 18+ | m.xinyushuwu2.com | [dat-bi/ext-vbook](https://github.com/dat-bi/ext-vbook) |
<!-- /forks -->

## Nguồn và ghi công

- Bộ công cụ phát triển và khuôn tiện ích: [dat-bi/ext-vbook](https://github.com/dat-bi/ext-vbook).
- **B-Qtrans**: phát triển tiếp từ tiện ích dịch Q-trans 2 của cộng đồng vBook, dùng bộ từ điển Quick Translator (QT).
- **Kỳ Huyễn (Cedric)**: bản sửa tiện ích "Dịch truyện tự động từ Qidian" của Đường đen ([duongden/vbook](https://github.com/duongden/vbook)).
- **Sói Xám 大灰狼 (Cedric)**: dữ liệu và API của máy chủ Sói Xám (大灰狼, langge); cách gọi API theo nguồn đọc truyện "大灰狼聚合"
  cho app Legado. Tài khoản, giới hạn đọc và nội dung do máy chủ Sói Xám quản lý.
- Nội dung truyện thuộc về tác giả và các trang/nền tảng gốc; các tiện ích chỉ hiển thị nội dung những trang đó cung cấp.
