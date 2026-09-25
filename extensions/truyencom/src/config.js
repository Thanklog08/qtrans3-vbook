// truyencom.com (2026-09-25): khuôn truyenfull, HTML dựng sẵn. truyenhoan.com cùng mã nguồn và cùng nội dung nhưng mã
// truyện khác (lệch vài trăm), nên chỉ đổi tên miền cho phần duyệt mới; link truyện đã lưu giữ nguyên tên miền của nó.
var DOMAIN = (function () {
    var raw = "";
    try { if (typeof domain !== "undefined") raw = domain; } catch (e) {}
    raw = String(raw || "").replace(/"/g, "").trim().toLowerCase();
    return raw === "truyenhoan.com" ? "truyenhoan.com" : "truyencom.com";
})();
var BASE_URL = "https://" + DOMAIN;

function fixUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    if (url.indexOf("http") !== 0) return BASE_URL + "/" + url;
    return url.replace(/^http:/, "https:");
}

// Gốc một link: https://truyencom.com (lấy theo link, không theo cài đặt).
function hostOf(url) {
    var m = /^(https?:\/\/[^\/]+)/.exec(fixUrl(url));
    return m ? m[1] : BASE_URL;
}

// Danh sách: .list-truyen .row[itemtype] gồm ảnh lười (data-image), h3.truyen-title a, tác giả, số chương.
// Lưu ý runtime vBook: select(...).first() không trả null khi rỗng, phải kiểm size().
function parseList(doc) {
    var data = [], seen = {};
    doc.select(".list-truyen .row[itemtype]").forEach(function (row) {
        var a = row.select("h3.truyen-title a");
        if (a.size() === 0) return;
        a = a.first();
        var link = fixUrl(a.attr("href") + "");
        if (!link || seen[link]) return;
        seen[link] = true;
        var img = row.select("[data-image]");
        var author = (row.select(".author[itemprop=author]").text() + "").trim();
        var chapters = "";
        row.select(".author").forEach(function (s) {
            var t = (s.text() + "").trim();
            if (/chương/i.test(t)) chapters = t;
        });
        data.push({
            name: (a.text() + "").trim(),
            link: link,
            cover: img.size() > 0 ? fixUrl(img.first().attr("data-image") + "") : "",
            description: author ? author + (chapters ? " · " + chapters : "") : chapters,
            host: hostOf(link)
        });
    });
    return data;
}

// Trang N của danh sách: <gốc>/trang-N/ (trang 1 là chính gốc).
function withPage(url, page) {
    url = fixUrl(url).replace(/[?#].*$/, "").replace(/trang-\d+\/?$/, "");
    if (url.slice(-1) !== "/") url += "/";
    return parseInt(page) > 1 ? url + "trang-" + page + "/" : url;
}

// Trang cuối trong thanh phân trang (link "Last" hoặc số lớn nhất).
function lastPage(doc) {
    var last = 1;
    doc.select("ul.pagination a[href]").forEach(function (a) {
        var m = /trang-(\d+)/.exec(a.attr("href") + "");
        if (m && parseInt(m[1]) > last) last = parseInt(m[1]);
    });
    return last;
}

function nextPage(doc, page) {
    var cur = parseInt(page || "1");
    return cur < lastPage(doc) ? String(cur + 1) : null;
}
