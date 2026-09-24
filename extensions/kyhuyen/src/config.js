// Trang cũ q.kyhuyen.com đã ngừng (mọi đường dẫn trả 404, 2026-09-24); nội dung chuyển sang kyhuyen.com.
var BASE_URL = "https://kyhuyen.com";

// Link đã lưu với tên miền cũ, link tương đối hoặc thiếu giao thức đều đưa về tên miền mới.
function fixUrl(url) {
    if (!url) return "";
    url = String(url).trim().replace(/^https?:\/\/q\.kyhuyen\.com/i, BASE_URL);
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    return url;
}

// Trang ghi tên tác giả như câu thường ("Khách sơn thanh lộc"); viết hoa đầu mỗi chữ để nhìn ra là tên riêng.
function nameCase(s) {
    return String(s || "").trim().split(/\s+/).map(function (w) {
        return w.charAt(0).toUpperCase() + w.substring(1);
    }).join(" ");
}

// Danh sách truyện (tìm kiếm, bảng xếp hạng, thể loại). Tiêu đề có nhãn nguồn ("WIKI", "TTV") trong cùng thẻ,
// nên lấy tên từ thuộc tính title của link bìa.
function parseList(doc) {
    var data = [];
    doc.select(".story-list .media.m-b-30").forEach(function (e) {
        var link = e.select(".media-left > a").first();
        if (!link) return;
        var name = link.attr("title") || e.select(".media-heading a[href*=/truyen/]").text();
        data.push({
            name: name,
            link: fixUrl(link.attr("href")),
            cover: fixUrl(e.select(".media-left img.media-object").attr("src")),
            description: nameCase(e.select(".media-body a[href*=/tac-gia/]").text()),
            host: BASE_URL
        });
    });
    return data;
}

// Trang kế nếu còn: số trang lớn nhất trong phân trang.
function nextPage(doc, page) {
    var last = 1;
    doc.select(".pagination a").forEach(function (a) {
        var m = /page=(\d+)/.exec(a.attr("href") || "");
        if (m && parseInt(m[1]) > last) last = parseInt(m[1]);
    });
    var current = parseInt(page || "1");
    return current < last ? String(current + 1) : null;
}
