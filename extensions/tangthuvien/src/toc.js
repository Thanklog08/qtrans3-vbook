load('config.js');

// url từ page.js: <truyện>?toc=<trang>&id=<mã truyện>, hoặc <truyện>?toc=so&last=<n> khi không gọi được mục lục.
// Link chương là <truyện>/<số chương>; site không nhận slug chương.
function execute(url) {
    url = String(url);
    var bookUrl = bookBase(url);
    var data = [];
    var so = /[?&]toc=so&last=(\d+)/.exec(url);
    if (so) {
        for (var n = 1; n <= parseInt(so[1]); n++) data.push({ name: "Chương " + n, url: bookUrl + "/" + n, host: BASE_URL });
        return Response.success(data);
    }
    var page = /[?&]toc=(\d+)/.exec(url);
    var id = /[?&]id=([0-9a-f]{24})/.exec(url);
    if (!page || !id) return null;
    var d = chapterPage(bookUrl, id[1], parseInt(page[1]));
    if (!d) return null;
    var seen = {};
    d.data.forEach(function (c) {
        // Mục lục có lúc lặp một chương (cùng số, cùng slug).
        if (seen[c.number]) return;
        seen[c.number] = true;
        var item = {
            name: String(c.name || ("Chương " + c.number)).trim().replace(/:$/, ""),
            url: bookUrl + "/" + c.number,
            host: BASE_URL
        };
        // Chương khoá: trên web chỉ hiện đoạn đầu, bản đủ nằm trong app của site.
        if (c.isLock || c.price > 0) item.pay = true;
        data.push(item);
    });
    return Response.success(data);
}
