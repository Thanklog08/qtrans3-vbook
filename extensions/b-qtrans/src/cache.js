// Bộ nhớ của Q-trans 3 (bản 10–11). Mọi mục đều có giới hạn; người dùng xoá bằng tay ở trang tiện ích › Bộ nhớ cục bộ.
//
//   qtrans3_books    ngữ cảnh THEO TRUYỆN: truyện nhận ra từ mục lục vBook đã gửi dịch (tên chương → truyện, số
//                    chương); mỗi truyện giữ đuôi bản dịch chương gần nhất + bảng tên. Tối đa 6 truyện.
//   qtrans3_recent   bản dịch vừa xong (45 phút, 10 mục, 150.000 ký tự): vBook gọi lại sau khi hết giờ chờ, hoặc gọi
//                    song song cùng nội dung, thì trả ngay không gọi API lần nữa.
//   qtrans3_inflight lượt đang dịch (60 giây, chờ tối đa 40 giây): lượt thứ hai cùng nội dung chờ lượt đầu thay vì gọi API song song.
//   qtrans3_chunks   từng đoạn chương đã dịch (6 giờ, 40 đoạn, 150.000 ký tự): lưu NGAY sau mỗi lượt gọi. Trình đọc
//                    vBook trên iPhone ngắt tiện ích sau ~30 giây; lần thử lại chỉ gửi đoạn còn thiếu.
//   qtrans3_log      nhật ký 15 lượt gần nhất: bắt đầu, từng bước, kết thúc (lượt bị ngắt dừng ở bước cuối ghi được).
//   qtrans3_lines    cache theo dòng cho danh sách/mục lục (4.000 dòng, 14 ngày): mở lại truyện không dịch lại mục lục.
//
// Các mục cũ (qtrans3_context chung cho mọi truyện; vbook_cache_manifest + vbook_fp_cache_* lưu nguyên chương) bị xoá.

var QT3_BOOKS = "qtrans3_books";
var QT3_RECENT = "qtrans3_recent";
var QT3_INFLIGHT = "qtrans3_inflight";
var QT3_LINES = "qtrans3_lines";
var BOOKS_MAX = 6;
var TITLES_PER_BOOK = 4000;
var BOOK_TTL = 7 * 24 * 3600 * 1000;
var RECENT_MAX = 10;
var RECENT_CHARS = 150000;
var RECENT_TTL = 45 * 60 * 1000;
// Lượt bị app ngắt không xoá được dấu "đang dịch" (finally không chạy): dấu phải hết hạn nhanh, và lượt sau chỉ chờ
// ngắn, nếu không nó ngồi chờ một lượt đã chết rồi bị ngắt theo.
var INFLIGHT_TTL = 60 * 1000;
var INFLIGHT_WAIT = 40 * 1000;
var CHUNKS_MAX = 40;
var CHUNKS_CHARS = 150000;
var CHUNKS_TTL = 6 * 3600 * 1000;
var QT3_CHUNKS = "qtrans3_chunks";
var QT3_LOG = "qtrans3_log";
var LOG_MAX = 15;
var LINES_MAX = 4000;
var LINES_TTL = 14 * 24 * 3600 * 1000;
var CONTEXT_TAIL_CHARS = 700;
var GLOSSARY_MAX = 150;
// Đuôi ngữ cảnh giữ theo SỐ CHƯƠNG, không phải một ô duy nhất: vBook tải trước 10 chương nên chương vừa dịch
// xong thường không phải chương người đọc mở kế tiếp (bản ≤ 15 để ctx đứng ở chương cuối của lượt tải trước,
// chương đọc thật không khớp num-1 nên mất sạch đuôi).
var TAILS_MAX = 12;

function qtNow() { return new Date().getTime(); }

function qtLoad(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        if (raw === null || raw === undefined || raw === "") return fallback;
        var v = JSON.parse(String(raw));
        return v && typeof v === "object" ? v : fallback;
    } catch (e) { return fallback; }
}

function qtSave(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

function qtHash(text) {
    var s = String(text);
    var h1 = 5381, h2 = 52711;
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        h1 = ((h1 << 5) + h1 + c) | 0;
        h2 = ((h2 << 5) + h2 + c * 7) | 0;
    }
    return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36);
}

// ---- dọn mục cũ (một lần; rẻ vì chỉ đọc 2 khoá) ----
function purgeLegacyStorage() {
    try {
        if (localStorage.getItem("qtrans3_context") !== null) localStorage.removeItem("qtrans3_context");
        var raw = localStorage.getItem("vbook_cache_manifest");
        if (raw !== null) {
            var manifest = JSON.parse(String(raw)) || [];
            for (var i = 0; i < manifest.length; i++) {
                if (manifest[i] && manifest[i].key) localStorage.removeItem(manifest[i].key);
            }
            localStorage.removeItem("vbook_cache_manifest");
        }
    } catch (e) {}
}

function purgeAllCaches() {
    purgeLegacyStorage();
    try {
        localStorage.removeItem(QT3_BOOKS);
        localStorage.removeItem(QT3_RECENT);
        localStorage.removeItem(QT3_INFLIGHT);
        localStorage.removeItem(QT3_LINES);
        localStorage.removeItem(QT3_CHUNKS);
    } catch (e) {}
}

// ---- bản dịch vừa xong ----
function recentGet(key) {
    var store = qtLoad(QT3_RECENT, { items: [] });
    var now = qtNow();
    for (var i = 0; i < store.items.length; i++) {
        var it = store.items[i];
        if (it.k === key && now - it.t < RECENT_TTL) return it.v;
    }
    return null;
}

function recentPut(key, value) {
    var store = qtLoad(QT3_RECENT, { items: [] });
    var now = qtNow();
    var items = [];
    for (var i = 0; i < store.items.length; i++) {
        var it = store.items[i];
        if (it.k !== key && now - it.t < RECENT_TTL) items.push(it);
    }
    items.unshift({ k: key, v: String(value), t: now });
    var total = 0, kept = [];
    for (var j = 0; j < items.length && kept.length < RECENT_MAX; j++) {
        total += items[j].v.length;
        if (total > RECENT_CHARS && kept.length > 0) break;
        kept.push(items[j]);
    }
    qtSave(QT3_RECENT, { items: kept });
}

// ---- chống gọi trùng song song ----
function inflightSet(key, on) {
    var store = qtLoad(QT3_INFLIGHT, {});
    var now = qtNow();
    var next = {};
    for (var k in store) {
        if (now - store[k] < INFLIGHT_TTL && k !== key) next[k] = store[k];
    }
    if (on) next[key] = now;
    qtSave(QT3_INFLIGHT, next);
}

// Có lượt khác đang dịch đúng nội dung này: chờ kết quả của nó (tối đa 120 giây) thay vì gọi API lần nữa.
function waitForSameRequest(key) {
    var store = qtLoad(QT3_INFLIGHT, {});
    var started = store[key];
    if (!started || qtNow() - started > INFLIGHT_TTL) return null;
    var deadline = Math.min(qtNow() + INFLIGHT_WAIT, started + INFLIGHT_TTL);
    try { logStep("chờ lượt trùng đang dịch"); } catch (e0) {}
    while (qtNow() < deadline) {
        try { sleep(1500); } catch (e) { return null; }
        var done = recentGet(key);
        if (done !== null) return done;
        var cur = qtLoad(QT3_INFLIGHT, {})[key];
        if (!cur) return recentGet(key);
    }
    return null;
}

// Danh sách (mục lục…): vBook có lúc gửi cùng một danh sách 2–3 lượt cùng lúc. Lượt sau chờ lượt đầu xong (tối đa
// 40 giây) rồi đọc cache theo dòng, không gọi API lần nữa.
function waitForSameList(key) {
    var store = qtLoad(QT3_INFLIGHT, {});
    var started = store[key];
    if (!started || qtNow() - started > INFLIGHT_TTL) return;
    try { logStep("chờ lượt danh sách trùng"); } catch (e0) {}
    var deadline = Math.min(qtNow() + INFLIGHT_WAIT, started + INFLIGHT_TTL);
    while (qtNow() < deadline) {
        try { sleep(1000); } catch (e) { return; }
        if (!qtLoad(QT3_INFLIGHT, {})[key]) return;
    }
}

// ---- cache theo dòng cho danh sách ----
function linesLoad() { return qtLoad(QT3_LINES, { m: {} }); }

function linesGet(store, key) {
    var e = store.m[key];
    if (!e) return null;
    if (qtNow() - e[1] > LINES_TTL) return null;
    return e[0];
}

function linesPutMany(store, pairs) {
    var now = qtNow();
    for (var i = 0; i < pairs.length; i++) store.m[pairs[i][0]] = [pairs[i][1], now];
    var keys = [];
    for (var k in store.m) keys.push(k);
    if (keys.length > LINES_MAX) {
        keys.sort(function(a, b) { return store.m[a][1] - store.m[b][1]; });
        for (var j = 0; j < keys.length - LINES_MAX; j++) delete store.m[keys[j]];
    }
    qtSave(QT3_LINES, store);
}

// ---- nhận truyện qua mục lục ----
var CN_DIGITS = { "零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
var CN_UNITS = { "十": 10, "百": 100, "千": 1000, "万": 10000 };

function cnNumber(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    var total = 0, section = 0, num = 0;
    for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (CN_DIGITS[ch] !== undefined) { num = CN_DIGITS[ch]; }
        else if (CN_UNITS[ch] !== undefined) {
            var u = CN_UNITS[ch];
            if (u === 10000) { section = (section + num) * u; total += section; section = 0; }
            else { section += (num === 0 ? 1 : num) * u; }
            num = 0;
        } else { return null; }
    }
    return total + section + num;
}

function chapterNumber(title) {
    var m = String(title).match(/第\s*([0-9零〇一二三四五六七八九十百千万两]+)\s*[章节回]/);
    if (m) return cnNumber(m[1]);
    m = String(title).match(/^\s*(?:chương|chapter|ch\.?)\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
    return null;
}

function normTitle(s) {
    return String(s).replace(/[\s　·•:：,，.。!！?？、\-—_~～()（）【】\[\]《》<>"“”'‘’|｜]/g, "").toLowerCase();
}

function looksLikeToc(lines) {
    var nonEmpty = 0, hits = 0;
    for (var i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        nonEmpty++;
        if (chapterNumber(lines[i]) !== null) hits++;
    }
    return nonEmpty >= 5 && hits / nonEmpty >= 0.6;
}

function booksLoad() {
    var store = qtLoad(QT3_BOOKS, { b: {} });
    if (!store.b) store.b = {};
    return store;
}

function booksSave(store) {
    var ids = [];
    var now = qtNow();
    for (var id in store.b) {
        if (now - (store.b[id].used || 0) > BOOK_TTL) delete store.b[id];
        else ids.push(id);
    }
    if (ids.length > BOOKS_MAX) {
        ids.sort(function(a, b) { return (store.b[a].used || 0) - (store.b[b].used || 0); });
        for (var i = 0; i < ids.length - BOOKS_MAX; i++) delete store.b[ids[i]];
    }
    qtSave(QT3_BOOKS, store);
}

// Mục lục vBook gửi dịch (một hoặc nhiều lượt): ghi tên chương → số chương cho truyện chứa nó.
function registerToc(lines) {
    var store = booksLoad();
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
        var t = lines[i].trim();
        if (!t) continue;
        var num = chapterNumber(t);
        entries.push([qtHash(normTitle(t)), num === null ? i : num]);
    }
    if (entries.length === 0) return null;
    // Truyện đã biết nếu trùng tên chương nào (mục lục có thể đến nhiều khúc).
    var bookId = null;
    for (var id in store.b) {
        var titles = store.b[id].titles || {};
        for (var j = 0; j < entries.length && j < 40; j++) {
            if (titles[entries[j][0]] !== undefined) { bookId = id; break; }
        }
        if (bookId) break;
    }
    if (!bookId) bookId = "b" + entries[0][0].substring(0, 10);
    var book = store.b[bookId] || { titles: {}, ctx: null };
    var count = 0;
    for (var t2 in book.titles) count++;
    for (var k = 0; k < entries.length && count < TITLES_PER_BOOK; k++) {
        if (book.titles[entries[k][0]] === undefined) count++;
        book.titles[entries[k][0]] = entries[k][1];
    }
    book.used = qtNow();
    store.b[bookId] = book;
    booksSave(store);
    return bookId;
}

// Chương đang dịch thuộc truyện nào: tra dòng tiêu đề (dòng đầu không rỗng) trong các mục lục đã ghi.
function findBookForChapter(text) {
    var lines = String(text).split("\n");
    var first = "";
    for (var i = 0; i < lines.length && i < 5; i++) {
        if (lines[i].trim()) { first = lines[i].trim(); break; }
    }
    if (!first) return null;
    var h = qtHash(normTitle(first));
    var store = booksLoad();
    for (var id in store.b) {
        var titles = store.b[id].titles || {};
        if (titles[h] !== undefined) return { id: id, num: chapterNumber(first) !== null ? chapterNumber(first) : titles[h] };
    }
    return null;
}

function bookContextGet(ref) {
    if (!ref) return { tail: "", glossary: {}, tailUsed: false };
    var book = booksLoad().b[ref.id];
    if (!book) return { tail: "", glossary: {}, tailUsed: false };
    var ctx = book.ctx || null;
    // gv 2: bảng tên lấy từ Name (bản 15). Bảng cũ lẫn cụm VietPhrase thì bỏ.
    var glossary = ctx && ctx.gv === 2 && ctx.glossary ? ctx.glossary : {};
    // Đuôi của ĐÚNG chương liền trước, tra theo số chương nên thứ tự dịch không còn ảnh hưởng.
    var tail = "";
    if (ref.num !== null && ref.num !== undefined) {
        var tails = book.tails || {};
        tail = String(tails[String(ref.num - 1)] || "");
    }
    // Bản ≤ 15 chỉ có một ô ctx; đọc nốt cho lần đầu sau khi cập nhật.
    if (!tail && ctx && ctx.num !== null && ref.num !== null && ctx.num === ref.num - 1) tail = String(ctx.tail || "");
    return { tail: tail, glossary: glossary, tailUsed: tail !== "" };
}

function bookContextPut(ref, translated, glossary) {
    if (!ref) return;
    var store = booksLoad();
    var book = store.b[ref.id];
    if (!book) return;
    var keys = [];
    for (var k in glossary) keys.push(k);
    for (var i = 0; i < keys.length - GLOSSARY_MAX; i++) delete glossary[keys[i]];
    var tail = String(translated).slice(-CONTEXT_TAIL_CHARS);
    if (ref.num !== null && ref.num !== undefined) {
        if (!book.tails) book.tails = {};
        book.tails[String(ref.num)] = tail;
        var nums = [];
        for (var n in book.tails) nums.push(parseInt(n, 10));
        if (nums.length > TAILS_MAX) {
            nums.sort(function(a, b) { return a - b; });
            for (var d = 0; d < nums.length - TAILS_MAX; d++) delete book.tails[String(nums[d])];
        }
    }
    book.ctx = { tail: tail, glossary: glossary, num: ref.num, gv: 2 };
    book.used = qtNow();
    booksSave(store);
}

// ---- thể loại truyện (chọn văn phong tự động) ----
// Điểm thể loại cộng dồn qua từng chương của cùng truyện: một chương lạc đề không đổi được văn phong của cả bộ,
// và càng đọc thì càng chắc. Không có truyện (chưa gặp mục lục) thì chỉ dùng điểm của chương đang dịch.
function genreRemember(ref, scores) {
    if (!ref) return scores;
    var store = booksLoad();
    var book = store.b[ref.id];
    if (!book) return scores;
    var total = book.g || {};
    for (var k in scores) total[k] = (total[k] || 0) + scores[k];
    // Giữ điểm ở mức vừa phải để truyện đổi giọng giữa chừng vẫn theo kịp.
    var sum = 0;
    for (var k2 in total) sum += total[k2];
    if (sum > 2000) { for (var k3 in total) total[k3] = Math.round(total[k3] / 2); }
    book.g = total;
    book.used = qtNow();
    booksSave(store);
    return total;
}

// ---- từng đoạn chương ----
function chunkGet(key) {
    var store = qtLoad(QT3_CHUNKS, { items: [] });
    var now = qtNow();
    for (var i = 0; i < store.items.length; i++) {
        if (store.items[i].k === key && now - store.items[i].t < CHUNKS_TTL) return store.items[i].v;
    }
    return null;
}

function chunkPut(key, value) {
    var store = qtLoad(QT3_CHUNKS, { items: [] });
    var now = qtNow();
    var items = [{ k: key, v: String(value), t: now }];
    var total = items[0].v.length;
    for (var i = 0; i < store.items.length && items.length < CHUNKS_MAX; i++) {
        var it = store.items[i];
        if (it.k === key || now - it.t >= CHUNKS_TTL) continue;
        total += it.v.length;
        if (total > CHUNKS_CHARS) break;
        items.push(it);
    }
    qtSave(QT3_CHUNKS, { items: items });
}

// ---- nhật ký ----
var logId = null;
var logStartedAt = 0;

function logStart(extra, length) {
    logStartedAt = qtNow();
    logId = logStartedAt.toString(36);
    var store = qtLoad(QT3_LOG, { items: [] });
    store.items.unshift({ id: logId, at: new Date(logStartedAt).toISOString(), extra: String(extra), len: length, step: "bắt đầu", s: 0 });
    store.items = store.items.slice(0, LOG_MAX);
    qtSave(QT3_LOG, store);
}

function logStep(step) {
    if (!logId) return;
    var store = qtLoad(QT3_LOG, { items: [] });
    for (var i = 0; i < store.items.length; i++) {
        if (store.items[i].id === logId) {
            store.items[i].step = String(step).substring(0, 200);
            store.items[i].s = Math.round((qtNow() - logStartedAt) / 100) / 10;
            break;
        }
    }
    qtSave(QT3_LOG, store);
}
