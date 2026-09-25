load('config.js');

function execute(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    var doc = response.html();
    // Thẻ chương: <h1>#số Tên</h1> rồi khối nội dung (style font-size) gồm các <p>, xen <p></p> làm dòng trống.
    var box = doc.select("div[data-slot=card] div[style*=font-size]");
    if (box.size() === 0) return null;
    var html = (box.first().html() + "").replace(/<p>\s*<\/p>/g, "");
    // Chương khoá: site chỉ trả đoạn đầu, kèm nút "Xem nội dung đầy đủ" dẫn sang app. Với UA điện thoại nút này nằm
    // trong khối streaming ngoài thẻ chương, nên tìm theo chữ trên cả trang.
    if (doc.select("a:contains(Xem nội dung đầy đủ)").size() > 0) {
        html += "<p><i>(Chương này bị khoá trên tangthuvien.org: web chỉ cho xem đoạn đầu, bản đầy đủ đọc trong app Tàng Thư Viện.)</i></p>";
    }
    return Response.success(html);
}
