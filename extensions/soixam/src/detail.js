load('config.js');

// Trang truyện: POST /detail. Thông tin ghi tiếng Việt (nền tảng, thể loại, trạng thái, số chữ, điểm, lượt đọc, nhân vật chính,
// chương mới nhất); tên truyện, tác giả, giới thiệu giữ nguyên để vBook dịch.
function execute(url) {
    var book = bookOf(url);
    if (!book) return null;
    var json = api("POST", "/detail", { book_id: book.id, source: book.source, tab: book.tab }, { html: "" });
    if (!json) return Response.error("Không kết nối được máy chủ Sói Xám (đã thử " + HOSTS.length + " máy).");
    var b = json.data;
    if (!b || !b.book_name) return Response.error("Sói Xám không có truyện này" + (json.msg ? ": " + json.msg : ""));

    var lines = [];
    var add = function (label, value) { if (value) lines.push("<b>" + label + ":</b> " + escapeHtml(value)); };
    add("Nền tảng", platformName(b.source || book.source));
    add("Thể loại", String(b.category || b.tags || ""));
    add("Trạng thái", statusText(b.status));
    add("Độ dài", wordsText(b.word_number));
    var sc = scoreText(b.score); if (sc) add("Điểm", sc.replace("★", "") + "/10");
    var rc = countText(b.read_count), ra = countText(b.read_count_all);
    if (rc || ra) add("Lượt đọc", (rc ? rc + " người đang đọc" : "") + (rc && ra ? " · " : "") + (ra ? "tổng " + ra : ""));
    add("Nhân vật chính", String(b.role || "").replace(/,/g, ", "));
    var last = String(b.last_chapter_title || "");
    var at = dateText(b.last_chapter_update_time);
    if (last || at) add("Chương mới", last + (last && at ? " · " : "") + at);

    return Response.success({
        name: cleanName(b.book_name),
        cover: String(b.thumb_url || ""),
        author: String(b.author || ""),
        description: escapeHtml(String(b.abstract || "")).replace(/\n/g, "<br>"),
        detail: lines.join("<br>"),
        ongoing: statusText(b.status) !== "Hoàn thành",
        host: SERVER
    });
}
