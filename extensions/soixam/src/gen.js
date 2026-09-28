load('config.js');

// Danh sách truyện của một mục khám phá (input = đường dẫn /get_discover?… không kèm máy chủ). Xếp hạng trả ~25 truyện
// mỗi trang, thể loại 10; hết thì trang rỗng.
var MAX_PAGE = 50;

function execute(input, page) {
    page = page ? parseInt(page, 10) : 1;
    var path = String(input).replace(/^https?:\/\/[^\/]+/, "").replace(/&page=[^&]*/, "");
    var q = path.indexOf("?");
    var query = {};
    if (q >= 0) {
        path.slice(q + 1).split("&").forEach(function (kv) {
            var i = kv.indexOf("=");
            if (i > 0) query[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
        });
        path = path.slice(0, q);
    }
    query.page = page;
    var json = api("GET", path, query);
    if (!json) return Response.error("Không kết nối được máy chủ Sói Xám (đã thử " + HOSTS.length + " máy).");
    var rows = (json.data || []).filter(isBook);
    var data = rows.map(function (b) { return listItem(b, false); });
    return Response.success(data, data.length && page < MAX_PAGE ? String(page + 1) : null);
}
