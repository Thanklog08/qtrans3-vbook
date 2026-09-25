load('config.js');

function execute(url) {
    var doc = getDoc(url);
    if (!doc) return null;
    if (doc.select(".nodeContent").size() === 0) return null;
    // Chương VIP khi chưa đăng nhập: khối .noLogin "您还没有登录" thay cho nội dung.
    if (doc.select(".nodeContent .noLogin").size() > 0) {
        return Response.success("<p><i>(Chương VIP của 飞卢: cần tài khoản faloo và mua chương trên faloo.com, tiện ích không đọc được.)</i></p>");
    }
    var html = [];
    doc.select(".nodeContent > p").forEach(function (p) {
        // Quảng cáo cuối chương: chữ đỏ <font>/link nạp tiền.
        if (p.select("a, font").size() > 0) return;
        var t = (p.html() + "").trim();
        if (t) html.push(t);
    });
    // Đoạn cuối là câu khẩu hiệu đổi ngẫu nhiên ("飞卢小说，飞要你好看！", "读书三件事：阅读，收藏，加打赏！").
    if (html.length && html[html.length - 1].length < 40 && /飞卢|打赏|收藏|月票|鲜花/.test(html[html.length - 1])) html.pop();
    if (!html.length) return null;
    return Response.success("<p>" + html.join("</p><p>") + "</p>");
}
