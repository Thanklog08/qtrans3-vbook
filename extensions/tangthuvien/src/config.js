// tangthuvien.org (2026-09-25): Next.js App Router. HTML dựng sẵn có đủ danh sách, chi tiết và nội dung chương;
// mục lục chỉ lấy được qua Server Action "actionGetChaptersOfBook" (POST vào trang truyện, tối đa 50 chương/lượt).
var BASE_URL = "https://tangthuvien.org";

// Mã action đổi mỗi lần site build lại; mã mới được dò từ chunk JS và nhớ trong localStorage (findAction).
var CHAPTER_ACTION = "c054f80bd4c9fd1fe855acd2717efefb1a036ed05f";

function fixUrl(url) {
    if (!url) return "";
    url = String(url).trim().replace(/^https?:\/\/(www\.)?tangthuvien\.org/i, BASE_URL);
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    if (url.indexOf("http") !== 0) return BASE_URL + "/" + url;
    return url;
}

// Link truyện: https://tangthuvien.org/<slug>. Bỏ query (?toc=…), số chương và dấu / cuối.
function bookBase(url) {
    var u = fixUrl(url).replace(/[?#].*$/, "");
    var m = /^(https?:\/\/[^\/]+\/[^\/]+)/.exec(u);
    return m ? m[1] : u;
}

// Ảnh bìa gốc (s2.ttyapi.site, s.truyenonl.net…) nặng tới vài trăm KB; bộ tối ưu ảnh của site trả WebP ~30–60 KB.
// Độ rộng phải thuộc danh sách Next.js cho phép (256, 384, 640…).
function thumb(src, w) {
    src = String(src || "");
    var m = /[?&]url=([^&]+)/.exec(src);
    var orig = m ? decodeURIComponent(m[1]) : src;
    if (!orig) return "";
    if (orig.indexOf("/") === 0) return fixUrl(orig);
    return BASE_URL + "/_next/image?url=" + encodeURIComponent(orig) + "&w=" + (w || 384) + "&q=75";
}

// Trang danh sách dùng React streaming: phần thể loại/giới thiệu của mỗi mục nằm trong khối ẩn <div hidden id="S:x">,
// chỗ của nó trong mục là <template id="P:x">.
// Lưu ý runtime vBook: select(...).first() không trả null khi rỗng, phải kiểm size().
function streamed(doc, item) {
    var parts = [item];
    item.select("template[id^='P:']").forEach(function (t) {
        var s = doc.select("[id='S:" + (t.attr("id") + "").substring(2) + "']");
        if (s.size() > 0) parts.push(s.first());
    });
    return parts;
}

function parseList(doc) {
    var data = [], seen = {};
    doc.select("div.items-start").forEach(function (item) {
        var a = item.select("a[href]:has(h3)");
        if (a.size() === 0) return;
        a = a.first();
        var href = a.attr("href") + "";
        if (!href || seen[href]) return;
        seen[href] = true;
        var img = item.select("img");
        var genre = "";
        streamed(doc, item).forEach(function (p) {
            var g = p.select("span.text-muted-foreground");
            if (!genre && g.size() > 0) genre = (g.first().text() + "").trim();
        });
        data.push({
            name: (a.select("h3").text() + "").trim(),
            link: fixUrl(href),
            cover: img.size() > 0 ? thumb(img.first().attr("src"), 384) : "",
            description: genre,
            host: BASE_URL
        });
    });
    return data;
}

function withPage(url, page) {
    url = fixUrl(url);
    if (/[?&]page=\d+/.test(url)) return url.replace(/([?&]page=)\d+/, "$1" + page);
    return url + (url.indexOf("?") > -1 ? "&" : "?") + "page=" + page;
}

// Trang kế nếu còn: số trang lớn nhất trong thanh phân trang.
function nextPage(doc, page) {
    var last = 1;
    doc.select("nav[aria-label=Pagination] a[href]").forEach(function (a) {
        var m = /[?&]page=(\d+)/.exec(a.attr("href") + "");
        if (m && parseInt(m[1]) > last) last = parseInt(m[1]);
    });
    var cur = parseInt(page || "1");
    return cur < last ? String(cur + 1) : null;
}

// Dữ liệu React Server Components nhúng trong trang: self.__next_f.push([1,"…"]) nối lại thành một chuỗi.
function flight(html) {
    var out = [], re = /self\.__next_f\.push\((\[1,"(?:[^"\\]|\\[\s\S])*"\])\)/g, m;
    while ((m = re.exec(html)) !== null) {
        try { out.push(JSON.parse(m[1])[1]); } catch (e) {}
    }
    return out.join("");
}

// Đọc một object/array JSON bắt đầu tại vị trí i của chuỗi.
function jsonAt(s, i) {
    var depth = 0, inStr = false;
    for (var j = i; j < s.length; j++) {
        var c = s.charAt(j);
        if (inStr) {
            if (c === "\\") j++;
            else if (c === "\"") inStr = false;
        } else if (c === "\"") inStr = true;
        else if (c === "{" || c === "[") depth++;
        else if (c === "}" || c === "]") {
            depth--;
            if (depth === 0) {
                try { return JSON.parse(s.substring(i, j + 1)); } catch (e) { return null; }
            }
        }
    }
    return null;
}

// Chuỗi dài được tách thành dòng riêng "<id>:T<độ dài byte UTF-8 hệ 16>,<văn bản>" và giá trị chỉ còn "$<id>".
function flightText(s, v) {
    var m = /^\$([0-9a-f]+)$/.exec(String(v));
    if (!m) return v;
    var head = new RegExp("(^|\\n)" + m[1] + ":T([0-9a-f]+),").exec(s);
    if (!head) return "";
    var bytes = parseInt(head[2], 16), start = head.index + head[0].length, j = start;
    while (bytes > 0 && j < s.length) {
        var c = s.charCodeAt(j);
        bytes -= c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xD800 && c < 0xDC00) ? 4 : 3;
        j += (c >= 0xD800 && c < 0xDC00) ? 2 : 1;
    }
    return s.substring(start, j);
}

// Trang truyện có props {"book":{…},"newChapters":[…]}: tên, tác giả, bìa, giới thiệu, thể loại, _id (cho mục lục).
function bookInfo(html) {
    var s = flight(html);
    var i = s.indexOf("{\"book\":{");
    var info = i < 0 ? null : jsonAt(s, i);
    if (!info || !info.book) return null;
    var b = info.book;
    b.name = flightText(s, b.name);
    b.description = flightText(s, b.description || "");
    b.shortDescription = flightText(s, b.shortDescription || "");
    return info;
}

function actionId() {
    var v = null;
    try { v = localStorage.getItem("ttv_action"); } catch (e) {}
    return v && v !== "undefined" ? String(v) : CHAPTER_ACTION;
}

// Tìm mã action mục lục trong các chunk JS mà trang truyện nạp. Chunk riêng của trang truyện đứng cuối danh sách
// (trước là chunk dùng chung), nên duyệt từ cuối.
function findAction(bookUrl) {
    var res = fetch(bookUrl);
    if (!res.ok) return null;
    var html = res.text() + "", re = /\/_next\/static\/chunks\/[\w.\-]+\.js/g, m, seen = {}, chunks = [];
    while ((m = re.exec(html)) !== null) {
        if (!seen[m[0]]) chunks.push(m[0]);
        seen[m[0]] = true;
    }
    for (var i = chunks.length - 1; i >= 0; i--) {
        var js = fetch(BASE_URL + chunks[i]);
        if (!js.ok) continue;
        var a = /"([0-9a-f]{40,42})"[^"]{0,160}"actionGetChaptersOfBook"/.exec(js.text() + "");
        if (a) return a[1];
    }
    return null;
}

// Một trang mục lục (50 chương): {data:[{number,name,isLock,price,…}], meta:{totalPages,…}}.
// Trả "missing" khi site báo không có action (đã build lại).
function callChapters(bookUrl, bookId, page, id) {
    var res = fetch(bookUrl, {
        method: "POST",
        headers: {
            "next-action": id,
            "accept": "text/x-component",
            "content-type": "text/plain;charset=UTF-8"
        },
        body: JSON.stringify([{ bookId: bookId, page: page, limit: 50, isNewest: false }])
    });
    if (res.status === 404) return "missing";
    if (!res.ok) return null;
    var lines = (res.text() + "").split("\n");
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("\"statusCode\"") < 0) continue;
        try {
            var d = JSON.parse(lines[i].substring(lines[i].indexOf(":") + 1));
            if (d && d.data) return d;
        } catch (e) {}
    }
    return null;
}

function chapterPage(bookUrl, bookId, page) {
    var d = callChapters(bookUrl, bookId, page, actionId());
    if (d === "missing") {
        var id = findAction(bookUrl);
        if (!id) return null;
        try { localStorage.setItem("ttv_action", id); } catch (e) {}
        d = callChapters(bookUrl, bookId, page, id);
    }
    return d && d !== "missing" ? d : null;
}
