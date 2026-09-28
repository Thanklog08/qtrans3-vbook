load('config.js');

// Mục lục: POST /catalog trả cả mục lục một lượt (十日终焉: 1.496 chương). Bỏ hàng tên quyển (is_volume); tên chương giữ
// nguyên (tiện ích dịch nhận truyện/số chương theo tên này).
function execute(url) {
    var book = bookOf(url);
    if (!book) return null;
    var json = api("POST", "/catalog", { book_id: book.id, source: book.source, tab: book.tab }, { html: "" });
    if (!json) return Response.error("Không kết nối được máy chủ Sói Xám (đã thử " + HOSTS.length + " máy).");
    var rows = json.data && json.data.length !== undefined ? json.data : (json.data && json.data.lists) || [];
    var data = [];
    for (var i = 0; i < rows.length; i++) {
        var c = rows[i];
        if (!c || c.is_volume || !c.item_id) continue;
        var item = { name: String(c.title || "").trim(), url: chapterUrl(book, String(c.item_id)), host: SERVER };
        if (c.is_pay === true || c.need_pay === true) item.pay = true;
        data.push(item);
    }
    if (!data.length) return Response.error("Sói Xám chưa có mục lục truyện này" + (json.msg ? ": " + json.msg : ""));
    return Response.success(data);
}
