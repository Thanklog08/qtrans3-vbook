// Sói Xám 大灰狼 (2026-09-28): API tổng hợp truyện Trung (Fanqie, Qimao, QQ阅读, Shuqi…) mà nguồn Legado "大灰狼聚合 5.9.26"
// dùng. Máy chủ đổi từ *.czyl.cf / api.langge.cf sang *.langge.uk (20.langge.tk đã chết); máy nào lỗi thì tự thử máy kế.
// Khách chưa đăng nhập đọc được vài chương mỗi ngày; đăng nhập ở <máy chủ>/login trong trình duyệt của vBook (cookie
// qttoken) hoặc dán token vào cài đặt tiện ích.
//
// Link truyện:  <máy chủ>/online_detail?book_id=<mã>&source=<nền tảng>&tab=小说 (trang web của Sói Xám, mở được trong
//               trình duyệt); link Fanqie https://fanqienovel.com/page/<số> cũng nhận (mã Sói Xám = Base64 của số).
// Link chương:  <máy chủ>/content?book_id=<mã>&item_id=<mã chương>&source=<nền tảng>&tab=小说
// Máy chủ trong link chỉ để nhận dạng: script luôn gọi máy chủ đang chạy, nên truyện đã lưu không hỏng khi máy chủ đổi.
var HOSTS = [
    "https://v5.langge.uk",
    "https://v4.langge.uk",
    "https://v2.langge.uk",
    "https://v7.langge.uk",
    "https://v8.langge.uk",
    "https://v9.langge.uk",
    "https://v10.langge.uk",
    "http://219.154.201.122:5006"
];
var UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
var TAB = "小说";

/** Giá trị ô cài đặt (vBook tiêm thành biến toàn cục, giá trị là chuỗi, có khi bọc nháy kép). */
function cfg(v, def) {
    if (v === undefined || v === null) return def;
    v = String(v).replace(/^"(.*)"$/, "$1").trim();
    return v ? v : def;
}
var CFG_SERVER = cfg(typeof server !== "undefined" ? server : undefined, HOSTS[0]);
var CFG_TOKEN = cfg(typeof qttoken !== "undefined" ? qttoken : undefined, "");
/** Kênh ở Khám phá/Thể loại: "Nam", "Nữ", "Cả hai". */
var CFG_CHANNEL = cfg(typeof kenh !== "undefined" ? kenh : undefined, "Nam");
/** Phạm vi tìm: "Mọi nền tảng" | "Chỉ Fanqie". */
var CFG_SEARCH = cfg(typeof tim_kiem !== "undefined" ? tim_kiem : undefined, "Mọi nền tảng");

var SERVER = (function () {
    var s = CFG_SERVER.replace(/\/+$/, "");
    return /^https?:\/\//.test(s) ? s : HOSTS[0];
})();
var BASE_URL = SERVER;

function store(k, v) {
    try {
        if (v === undefined) return localStorage.getItem(k);
        localStorage.setItem(k, v);
    } catch (e) {}
    return null;
}

/** Máy chủ thử lần lượt: máy lần trước chạy được, máy trong cài đặt, rồi các máy còn lại. */
function hostOrder() {
    var out = [], last = store("soixam_host");
    [last, SERVER].concat(HOSTS).forEach(function (h) {
        if (h && out.indexOf(h) < 0) out.push(h);
    });
    return out;
}

function deviceId() {
    var d = store("soixam_device");
    if (!d) {
        d = "vbook-";
        for (var i = 0; i < 16; i++) d += "0123456789abcdef".charAt(Math.floor(Math.random() * 16));
        store("soixam_device", d);
    }
    return d;
}

/** Token đăng nhập: ô cài đặt, không có thì cookie qttoken của trình duyệt vBook (đăng nhập ở <máy chủ>/login). */
function loginToken(host) {
    var t = CFG_TOKEN.replace(/^qttoken=/, "").replace(/;.*$/, "");
    if (t) return t;
    try {
        if (typeof localCookie !== "undefined") {
            var hs = [host].concat(HOSTS);
            for (var i = 0; i < hs.length; i++) {
                var m = /qttoken=([^;\s]+)/.exec(String(localCookie.getCookie(hs[i]) || ""));
                if (m && m[1] !== "undefined") { store("soixam_token", m[1]); return m[1]; }
            }
        }
    } catch (e) {}
    return store("soixam_token") || "";
}

function qs(query) {
    var out = [];
    for (var k in query) if (query[k] !== undefined && query[k] !== null) out.push(k + "=" + encodeURIComponent(String(query[k])));
    return out.length ? "?" + out.join("&") : "";
}

/**
 * Gọi API, trả JSON đã parse (null = mọi máy chủ đều lỗi). Máy trả HTML (Cloudflare, trang lỗi) hay không phải JSON coi như
 * lỗi, thử máy kế; máy chạy được nhớ lại cho lượt sau.
 */
function api(method, path, query, body) {
    var hosts = hostOrder();
    for (var i = 0; i < hosts.length; i++) {
        var h = hosts[i];
        var headers = { "User-Agent": UA };
        var t = loginToken(h);
        if (t) headers["Cookie"] = "qttoken=" + t + "; deviceId=" + deviceId();
        var opt = { method: method, headers: headers, timeout: 20000 };
        if (body) {
            headers["Content-Type"] = "application/json";
            opt.body = JSON.stringify(body);
        }
        var res;
        try { res = fetch(h + path + qs(query), opt); } catch (e) { continue; }
        if (!res || !res.ok) continue;
        var text = String(res.text() || "").trim();
        if (text.charAt(0) !== "{" && text.charAt(0) !== "[") continue;
        var json;
        try { json = JSON.parse(text); } catch (e) { continue; }
        if (h !== store("soixam_host")) store("soixam_host", h);
        return json;
    }
    return null;
}

// ---- link ----

function param(url, name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(String(url));
    if (!m) return "";
    try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { return m[1]; }
}

var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Base64 không đệm của chuỗi ASCII (mã số Fanqie → mã truyện Sói Xám). */
function b64(s) {
    var out = "";
    for (var i = 0; i < s.length; i += 3) {
        var a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
        var n = (a << 16) | ((b || 0) << 8) | (c || 0);
        out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63);
        if (i + 1 < s.length) out += B64.charAt((n >> 6) & 63);
        if (i + 2 < s.length) out += B64.charAt(n & 63);
    }
    return out;
}

/** Truyện của một link: { id, source, tab } (null nếu không nhận ra). */
function bookOf(url) {
    url = String(url);
    var fq = /fanqienovel\.com\/(?:page|reader)\/(\d+)/.exec(url);
    if (fq && url.indexOf("/page/") >= 0) return { id: b64(fq[1]), source: "番茄", tab: TAB };
    var id = param(url, "book_id");
    if (!id) return null;
    return { id: id, source: param(url, "source") || "番茄", tab: param(url, "tab") || TAB };
}

function bookUrl(id, source, tab) {
    return SERVER + "/online_detail" + qs({ book_id: id, source: source || "番茄", tab: tab || TAB });
}

function chapterUrl(book, itemId) {
    return SERVER + "/content" + qs({ book_id: book.id, item_id: itemId, source: book.source, tab: book.tab });
}

// ---- hiển thị ----

var PLATFORMS = {
    "番茄": "Fanqie", "七猫": "Qimao", "书旗": "Shuqi", "svip_书旗": "Shuqi", "塔读": "Tadu", "江湖": "Jianghu", "小米": "Xiaomi",
    "米读": "Midu", "QQ阅读": "QQ Đọc", "svip_QQ阅读": "QQ Đọc", "QQ": "QQ", "顶点": "Đỉnh Điểm", "爱下电子书": "Ixdzs", "伪69": "69shu",
    "69书吧": "69shuba", "阅友小说": "Yueyou", "52书库": "52shuku", "完本小说": "Wanben", "鹿鹿": "Lulu", "星空小说": "Tinh Không",
    "365小说": "365xs", "冷冷文学": "Lengleng", "万相书城": "Wanxiang", "独步小说": "Dubu", "全本同人": "Toàn bản đồng nhân",
    "百度": "Baidu", "熊猫": "Xiongmao", "猫眼": "Maoyan", "淘小说": "Tao", "知乎": "Zhihu", "得奇": "Deqi", "企点": "Qidian",
    "星星小说": "Tinh Tinh", "搜书神器": "Soushu"
};
function platformName(p) { return PLATFORMS[p] || p || ""; }

/** Nền tảng đưa lên đầu kết quả tìm kiếm (truyện đầy đủ, ổn định); còn lại giữ thứ tự máy chủ trả. */
var PLATFORM_RANK = ["番茄", "七猫", "QQ阅读", "书旗", "塔读", "米读", "江湖", "顶点"];

function statusText(s) {
    s = String(s || "");
    if (/完结|完本|已完/.test(s)) return "Hoàn thành";
    if (/连载/.test(s)) return "Đang ra";
    return s;
}

function wordsText(w) {
    w = String(w || "").replace(/\s+/g, "");
    var m = /^([\d.]+)(万)?/.exec(w);
    if (!m) return "";
    var n = parseFloat(m[1]);
    if (!m[2]) n = n / 10000;
    return n >= 1 ? Math.round(n) + " vạn chữ" : "";
}

function countText(c) {
    var n = parseInt(String(c || "").replace(/[^\d]/g, ""), 10);
    if (!n) return "";
    if (n >= 1e7) return Math.round(n / 1e6) + " triệu";
    if (n >= 1e6) return (Math.round(n / 1e5) / 10 + "").replace(".", ",") + " triệu";
    if (n >= 1e3) return Math.round(n / 1e3) + " nghìn";
    return String(n);
}

function dateText(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
    return m ? parseInt(m[3], 10) + "/" + parseInt(m[2], 10) + "/" + m[1] : "";
}

function scoreText(s) {
    var m = /[\d.]+/.exec(String(s || ""));
    return m && parseFloat(m[0]) > 0 ? "★" + m[0] : "";
}

function cleanName(n) {
    return String(n || "").replace(/（别名：.*?）/g, "").trim();
}

/** Một truyện trong danh sách vBook: tên, bìa, dòng mô tả "[Fanqie] tác giả · trạng thái · số chữ · điểm · thể loại". */
function listItem(b, showPlatform) {
    var bits = [];
    if (b.author) bits.push(String(b.author));
    var st = statusText(b.status); if (st) bits.push(st);
    var w = wordsText(b.word_number); if (w) bits.push(w);
    var sc = scoreText(b.score); if (sc) bits.push(sc);
    var cat = String(b.category || b.tags || "").split(/[,，]/)[0];
    if (cat) bits.push(cat);
    return {
        name: cleanName(b.book_name),
        link: bookUrl(b.book_id, b.source, b.tab),
        cover: String(b.thumb_url || ""),
        description: (showPlatform ? "[" + platformName(b.source) + "] " : "") + bits.join(" · "),
        host: SERVER
    };
}

/** Hàng không phải truyện (tiêu đề nhóm "vip"/"svip" mà máy chủ chèn vào danh sách). */
function isBook(b) {
    return b && b.book_id && b.book_id !== "vip" && b.book_id !== "svip" && b.book_name;
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
