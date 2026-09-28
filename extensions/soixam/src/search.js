load('config.js');

// Tìm theo tên trên mọi nền tảng của Sói Xám (source=全部, ~18 nền tảng một lượt, ~1,5 s) hoặc chỉ Fanqie (cài đặt). Gõ
// "tên@nền tảng" (vd. 诡秘之主@QQ阅读) để tìm riêng một nền tảng. Kết quả: Fanqie, Qimao, QQ Đọc… lên trước, mỗi truyện ghi
// nền tảng; bỏ truyện trùng (cùng nền tảng, tên, tác giả).
var MAX_PAGE = 5;

function execute(key, page) {
    page = page ? parseInt(page, 10) : 1;
    key = String(key || "").trim();
    var source = CFG_SEARCH === "Chỉ Fanqie" ? "番茄" : "全部";
    var at = key.lastIndexOf("@");
    if (at > 0) { source = key.slice(at + 1).trim() || source; key = key.slice(0, at).trim(); }
    if (!key) return Response.success([]);
    var json = api("GET", "/search", { title: key, tab: TAB, source: source, page: page, disabled_sources: "0" });
    if (!json) return Response.error("Không kết nối được máy chủ Sói Xám (đã thử " + HOSTS.length + " máy).");
    var rows = (json.data || []).filter(isBook);
    var rank = function (b) { var i = PLATFORM_RANK.indexOf(String(b.source)); return i < 0 ? PLATFORM_RANK.length : i; };
    rows = rows.map(function (b, i) { return { b: b, i: i }; })
        .sort(function (x, y) { return rank(x.b) - rank(y.b) || x.i - y.i; })
        .map(function (x) { return x.b; });
    var seen = {}, data = [];
    rows.forEach(function (b) {
        var k = b.source + "|" + cleanName(b.book_name) + "|" + b.author;
        if (seen[k]) return;
        seen[k] = true;
        data.push(listItem(b, true));
    });
    return Response.success(data, data.length && page < MAX_PAGE ? String(page + 1) : null);
}
