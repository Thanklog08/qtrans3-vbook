load('config.js');

// Nội dung chương: POST /content (thân như nguồn Legado 5.9.26: tone_id 4 cho truyện chữ, version 4.11.5.1), cookie qttoken
// nếu đã đăng nhập. Chữ trả về là văn bản, mỗi dòng một đoạn (có nền tảng chèn <img>): đổi thành <p>. Hết lượt khách hay
// lỗi thì trả lỗi kèm cách đăng nhập — không trả thành nội dung chương, để vBook không lưu lời báo lỗi thay cho chương.
function execute(url) {
    var itemId = param(url, "item_id");
    var book = bookOf(url);
    if (!itemId || !book) return null;
    var json = api("POST", "/content", { book_id: book.id }, {
        html: "", item_id: itemId, source: book.source, tab: book.tab, tone_id: "4",
        variable: JSON.stringify({ custom: "" }), version: "4.11.5.1", app: "阅读神评表情", god: false
    });
    if (!json) return Response.error("Không kết nối được máy chủ Sói Xám (đã thử " + HOSTS.length + " máy).");
    var text = String(json.content || "");
    // Hết lượt khách máy chủ vẫn trả code 0, lời báo nằm ngay trong content: "您今日免登录访问次数已达上限(3次)！继续阅读请登录后
    // 刷新页面。" (đo 28/9/2026) — không được trả thành chữ chương.
    var notice = text.length < 300 && /访问次数|已达上限|请登录|登录后|登陆后|开通会员|会员专享/.test(text);
    if (!text.trim() || notice) {
        var msg = notice ? text.replace(/<[^>]+>/g, "").trim() : String(json.msg || "không có nội dung");
        var login = /登录|登陆|游客|次数|会员|vip|token|额度|上限/i.test(msg);
        return Response.error("Sói Xám: " + msg + (login
            ? " — Khách chỉ đọc được vài chương mỗi ngày. Đăng nhập: mở " + SERVER + "/login trong trình duyệt của vBook, đăng nhập rồi tải lại chương (hoặc dán token vào cài đặt tiện ích)."
            : ""));
    }
    var title = String(json.title || "").trim();
    var out = [];
    text.replace(/\r/g, "").split("\n").forEach(function (line) {
        var t = line.trim();
        if (!t) return;
        // Dòng đầu trùng tên chương: vBook đã hiện tên chương.
        if (!out.length && title && t === title) return;
        out.push(/^<img\b[^>]*>$/i.test(t) ? t : "<p>" + escapeHtml(t) + "</p>");
    });
    return Response.success(out.join(""));
}
