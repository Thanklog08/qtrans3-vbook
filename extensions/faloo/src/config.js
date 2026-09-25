// 飞卢小说网 (2026-09-25), bảng mã GBK. Dùng bản wap: b.faloo.com trả 302 về chính nó kèm cookie C3VK (phải gửi lại
// đúng giá trị vừa cấp), mà fetch của vBook không giữ cookie qua chuyển hướng nên lỗi 504. wap.faloo.com không kiểm tra này
// và cùng mã truyện/chương (/<mã>.html, /<mã>_<chương>.html).
var BASE_URL = "https://wap.faloo.com";

function fixUrl(url) {
    if (!url) return "";
    url = String(url).trim().replace(/^(https?:)?\/\/b\.faloo\.com/i, BASE_URL);
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    if (url.indexOf("http") !== 0) return BASE_URL + "/" + url;
    return url.replace(/^http:\/\/wap\./, "https://wap.");
}

function getDoc(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    return response.html("gbk");
}

// Mã truyện từ link /<mã>.html, /<mã>_<chương>.html hoặc /booklist_<mã>.html.
function bookId(url) {
    var m = /faloo\.com\/(?:booklist_)?(\d+)(?:[_.]|$)/.exec(String(url));
    return m ? m[1] : "";
}

// Mục truyện trong danh sách/tìm kiếm: ul.novelList li (tên .bl_r1_tit a, ảnh img.cover, tác giả + thể loại .nl_r1_author).
// Lưu ý runtime vBook: select(...).first() không trả null khi rỗng, phải kiểm size().
function parseList(doc) {
    var data = [], seen = {};
    doc.select("ul.novelList > li").forEach(function (li) {
        var a = li.select(".bl_r1_tit a[href]");
        if (a.size() === 0) return;
        a = a.first();
        var link = fixUrl(a.attr("href") + "");
        if (!/\/\d+\.html$/.test(link) || seen[link]) return;
        seen[link] = true;
        var img = li.select("img.cover");
        var who = li.select(".nl_r1_author a");
        // Chữ hiển thị có thể bị cắt ("花落剑收" thay cho "花落剑收鞘"); tên đủ nằm trong title.
        var author = who.size() > 0 ? ((who.first().attr("title") + "").trim() || (who.first().text() + "").trim()) : "";
        var genre = who.size() > 1 ? (who.last().text() + "").trim() : "";
        data.push({
            name: (a.attr("title") + "").trim() || (a.text() + "").trim(),
            link: link,
            cover: img.size() > 0 ? fixUrl(img.first().attr("src") + "") : "",
            description: author + (genre ? " · " + genre : ""),
            host: BASE_URL
        });
    });
    return data;
}

// Trang N: y_<nhóm>_<nhánh>_0_0_<loại>_<sắp xếp>.html (trang 1) → thêm _N; search_0_<N>.html?t=…&k=….
function withPage(url, page) {
    url = fixUrl(url);
    var m = /\/y_((?:\d+_){5}\d+)(?:_\d+)?\.html/.exec(url);
    if (m) return url.replace(m[0], "/y_" + m[1] + (parseInt(page) > 1 ? "_" + page : "") + ".html");
    return url.replace(/\/search_(\d+)_\d+\.html/, "/search_$1_" + page + ".html");
}

// Link "下一页" ở thanh phân trang (site không ghi tổng số trang).
function nextPage(doc, page) {
    var has = false;
    doc.select(".pageliste_body a").forEach(function (a) {
        if ((a.text() + "").indexOf("下一页") >= 0) has = true;
    });
    return has ? String(parseInt(page || "1") + 1) : null;
}
