load('config.js');

// Thể loại chỉ có trang truyện đã hoàn thành: /truyen-<tên>/full/ ở truyencom, /truyen-<tên>/hoan/ ở truyenhoan
// (/truyen-<tên>/ chuyển về đó). Lấy từ menu trang chủ.
function execute() {
    var response = fetch(BASE_URL + "/");
    if (!response.ok) return null;
    var doc = response.html();
    var data = [], seen = {};
    doc.select("a[href*='/full/'], a[href*='/hoan/']").forEach(function (a) {
        var m = /\/(truyen-[a-z0-9-]+)\/(full|hoan)\/?$/.exec(a.attr("href") + "");
        if (!m || seen[m[1]]) return;
        seen[m[1]] = true;
        var title = (a.attr("title") + "").replace(/^Truyện\s+/i, "").replace(/\s+(full|hoàn)$/i, "").trim();
        data.push({ title: title || (a.text() + "").trim(), input: BASE_URL + "/" + m[1] + "/" + m[2] + "/", script: "gen.js" });
    });
    return Response.success(data);
}
