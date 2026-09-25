load('config.js');

// Thể loại lọc được ở /truyen?genre= (2026-09-25). Thể loại khác (Tiên hiệp, Đô thị, Xuyên không…) trả danh sách
// không lọc, nên chỉ ghi trong phần thông tin, không làm nút.
var FILTERABLE = ("cuong-cuong adult bach-hop binh-dam cung-dau co-tri canh-ky can-dai co-tien-hiep co-dai da-su di-gioi " +
    "di-nang gia-dau goc-nhin-nam h he hien-dai huyen-bi huyen-nghi huyen-huyen huyen-ao hai-huoc hao-mon hau-cung-harem " +
    "hac-am-luu he-thong hong-hoang ho-cong khoa-huyen-khong-gian khoa-huyen khac kinh-di kiem-hiep ky-huyen ky-ao " +
    "light-novel linh-di lich-su ma-phap mat-the np ngon-tinh nguoc nhiet-huyet nhan-thu nhe-nhang non-cp nu-phu").split(" ");

function execute(url) {
    var bookUrl = bookBase(url);
    var response = fetch(bookUrl);
    if (!response.ok) return null;
    var html = response.text() + "";
    var info = bookInfo(html);
    if (!info) return fromDom(Html.parse(html));
    var b = info.book;

    var author = b.author && b.author.name ? String(b.author.name).trim() : "";
    var genres = [], genreNames = [];
    (b.categories || []).forEach(function (c) {
        var title = String(c.name).trim();
        genreNames.push(title);
        if (FILTERABLE.indexOf(String(c.slugId)) >= 0) genres.push({ title: title, input: "/truyen?genre=" + c.slugId, script: "gen.js" });
    });
    var locked = false;
    (info.newChapters || []).forEach(function (c) { if (c.isLock || c.price > 0) locked = true; });

    var detail = [];
    if (author) detail.push("Tác giả: " + author);
    if (b.contributor && b.contributor.name) detail.push("Người đăng: " + String(b.contributor.name).trim());
    detail.push("Tình trạng: " + (b.status === "COMPLETED" ? "Hoàn thành" : "Đang ra"));
    if (genreNames.length) detail.push("Thể loại: " + genreNames.join(", "));
    if (b.lastChapter) detail.push("Chương mới nhất: " + b.lastChapter);
    if (b.updatedAt) detail.push("Cập nhật: " + dateVi(b.updatedAt));
    if (b.totalViews != null) detail.push("Lượt xem: " + b.totalViews);
    if (b.followers != null) detail.push("Theo dõi: " + b.followers);
    // Truyện độc quyền dịch: web chỉ mở khoảng 100 chương đầu, chương sau chỉ hiện đoạn đầu (đọc đủ trong app của site).
    if (locked) detail.push("Chương mới bị khoá trên web, chỉ xem được đoạn đầu");

    var suggests = [];
    if (b.author && b.author.slugId) suggests.push({ title: "Cùng tác giả", input: "/tac-gia/" + b.author.slugId, script: "gen.js" });

    return Response.success({
        name: String(b.name).trim(),
        cover: b.cover && b.cover.length ? thumb(b.cover[0].url, 640) : "",
        author: author,
        description: textHtml(b.description || b.shortDescription || ""),
        detail: detail.join("<br>"),
        ongoing: b.status !== "COMPLETED",
        genres: genres,
        suggests: suggests,
        host: BASE_URL
    });
}

// Dự phòng khi site đổi cách nhúng dữ liệu: lấy từ HTML.
function fromDom(doc) {
    var author = (doc.select("a[href^='/tac-gia/']").text() + "").trim();
    var genres = [];
    doc.select("a[href*='genre=']").forEach(function (a) {
        var m = /[?&]genre=([a-z0-9-]+)/.exec(a.attr("href") + "");
        if (m && FILTERABLE.indexOf(m[1]) >= 0) genres.push({ title: (a.text() + "").trim(), input: "/truyen?genre=" + m[1], script: "gen.js" });
    });
    return Response.success({
        name: (doc.select("h1").text() + "").trim(),
        cover: thumb(doc.select("meta[property=og:image]").attr("content") + "", 640),
        author: author,
        description: textHtml(doc.select("meta[name=description]").attr("content") + ""),
        detail: author ? "Tác giả: " + author : "",
        ongoing: true,
        genres: genres,
        host: BASE_URL
    });
}

function textHtml(s) {
    return String(s).trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br>");
}

function dateVi(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : String(iso);
}
