load('config.js');

// Mục lục chia trang 50 chương (giới hạn của site). Gọi trang 1 để biết số trang, rồi trả một URL cho mỗi trang;
// toc.js đọc số trang và mã truyện từ query của URL đó.
function execute(url) {
    var bookUrl = bookBase(url);
    var response = fetch(bookUrl);
    if (!response.ok) return null;
    var html = response.text() + "";
    var info = bookInfo(html);
    var bookId = info ? info.book._id : "";
    if (!bookId) {
        var m = /\\"book\\":\{\\"_id\\":\\"([0-9a-f]{24})/.exec(html);
        if (m) bookId = m[1];
    }
    var first = bookId ? chapterPage(bookUrl, bookId, 1) : null;
    if (!first) {
        // Không gọi được mục lục (site đổi cách lấy): đánh số 1..chương mới nhất, tên chương để trống.
        var last = info && info.book.lastChapter ? info.book.lastChapter : 0;
        if (!last) return null;
        return Response.success([bookUrl + "?toc=so&last=" + last]);
    }
    var total = first.meta && first.meta.totalPages ? first.meta.totalPages : 1;
    var pages = [];
    for (var p = 1; p <= total; p++) pages.push(bookUrl + "?toc=" + p + "&id=" + bookId);
    return Response.success(pages);
}
