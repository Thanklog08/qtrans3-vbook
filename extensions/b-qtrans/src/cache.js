// Bộ nhớ của Q-trans 3 (bản 19). Mọi mục đều có giới hạn; người dùng xoá bằng tay ở trang tiện ích › Bộ nhớ cục bộ.
//
// Bản ≤ 18 gom mọi thứ vào vài cục JSON lớn (sổ truyện ~690k, mục lục ~440k, chương/đoạn 150k mỗi cục) và mỗi lượt
// dịch một chương parse cục sổ truyện 5 lần, ghi lại 3 lần: ~4 MB parse + ~2,3 MB ghi cho MỘT chương. Trên iPhone
// (900 chương/ngày, 2 lượt song song) đây là tải vô lý cho cầu localStorage của vBook. Bản 19 chia nhỏ:
//
//   qtrans3_c_<khoá>  một bản dịch chương hoặc một đoạn: {v, t}. Chỉ mục qtrans3_cidx [[khoá, t, dài]…] ≤ 120 mục,
//                     ≤ 800.000 ký tự, 7 ngày. Mở lại chương đã dịch không tốn lượt gọi nào; lượt chạy chồng nhau không
//                     xoá mục của nhau vì mỗi mục một khoá.
//   qtrans3_b_<id>    một truyện: tên chương (≤ 1.500) → số chương, 12 đuôi gần nhất, bảng tên, điểm thể loại.
//                     Chỉ mục qtrans3_bidx {ids, last}. Chỉ truyện có thay đổi mới được ghi lại.
//   qtrans3_lines     cache theo dòng cho danh sách/mục lục (≤ 1.500 dòng, 14 ngày); chỉ đường danh sách mới đọc.
//   qtrans3_inflight  lượt đang dịch (60 giây, chờ tối đa 40 giây).
//   qtrans3_log       nhật ký 15 lượt gần nhất.
//
// Trong một lượt chạy, mỗi khoá chỉ parse một lần (memo). qtStats đếm số lần đọc/ghi và cục ghi lớn nhất, ghi ra
// qtrans3_last_call.storage để nghiệm thu trên máy thật. Khoá cũ (qtrans3_books/recent/chunks) tự chuyển ở lượt đầu.

var QT3_INFLIGHT = "qtrans3_inflight";
var QT3_LINES = "qtrans3_lines";
var QT3_LOG = "qtrans3_log";
var QT3_BIDX = "qtrans3_bidx";
var QT3_BOOK = "qtrans3_b_";
var QT3_CIDX = "qtrans3_cidx";
var QT3_ENTRY = "qtrans3_c_";
// Bản ≤ 18
var QT3_BOOKS_OLD = "qtrans3_books";
var QT3_RECENT_OLD = "qtrans3_recent";
var QT3_CHUNKS_OLD = "qtrans3_chunks";

var BOOKS_MAX = 6;
var TITLES_PER_BOOK = 1500;
var BOOK_TTL = 7 * 24 * 3600 * 1000;
var ENTRY_MAX = 80;
var ENTRY_CHARS = 500000;
var ENTRY_TTL = 7 * 24 * 3600 * 1000;
// Lượt bị app ngắt không xoá được dấu "đang dịch" (finally không chạy): dấu phải hết hạn nhanh, và lượt sau chỉ chờ
// ngắn, nếu không nó ngồi chờ một lượt đã chết rồi bị ngắt theo.
var INFLIGHT_TTL = 60 * 1000;
var INFLIGHT_WAIT = 40 * 1000;
var LOG_MAX = 15;
var LINES_MAX = 1500;
var LINES_TTL = 14 * 24 * 3600 * 1000;
var CONTEXT_TAIL_CHARS = 700;
var GLOSSARY_MAX = 150;
// Đuôi ngữ cảnh giữ theo SỐ CHƯƠNG: vBook tải trước 10 chương nên chương vừa dịch xong thường không phải chương
// người đọc mở kế tiếp.
var TAILS_MAX = 12;
// Đoán truyện theo lượt gần nhất (bản 18): mục lục/chương của truyện đó phải mới đi qua trong 30 phút.
var LAST_BOOK_TTL = 30 * 60 * 1000;
// Không biết số chương thì chỉ nối đuôi khi chương trước của truyện đó vừa dịch xong trong 15 phút.
var CHAIN_TTL = 15 * 60 * 1000;

function qtNow() { return new Date().getTime(); }

// ---- lớp đọc/ghi: memo trong lượt + đếm ----
var qtMem = {};
var qtStats = { reads: 0, writes: 0, removes: 0, maxWrite: 0, bytes: 0 };

function qtMemReset() {
    qtMem = {};
    qtStats = { reads: 0, writes: 0, removes: 0, maxWrite: 0, bytes: 0 };
}

// fresh: bỏ memo, đọc lại từ localStorage (dùng khi chờ lượt khác đang ghi).
function qtLoad(key, fallback, fresh) {
    if (!fresh && Object.prototype.hasOwnProperty.call(qtMem, key)) return qtMem[key];
    var v = fallback;
    try {
        qtStats.reads++;
        var raw = localStorage.getItem(key);
        if (raw !== null && raw !== undefined && raw !== "" && raw !== "undefined") {
            var parsed = JSON.parse(String(raw));
            if (parsed && typeof parsed === "object") v = parsed;
        }
    } catch (e) {}
    qtMem[key] = v;
    return v;
}

function qtSave(key, value) {
    qtMem[key] = value;
    try {
        var s = JSON.stringify(value);
        qtStats.writes++;
        qtStats.bytes += s.length;
        if (s.length > qtStats.maxWrite) qtStats.maxWrite = s.length;
        localStorage.setItem(key, s);
    } catch (e) {}
}

function qtRemove(key) {
    delete qtMem[key];
    try { qtStats.removes++; localStorage.removeItem(key); } catch (e) {}
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

// Cầu localStorage của vBook trả chuỗi "undefined" (không phải null) cho khoá chưa có — kiểm trên vBook 1.0.
function qtHas(key) {
    try {
        var raw = localStorage.getItem(key);
        return raw !== null && raw !== undefined && raw !== "" && raw !== "undefined";
    } catch (e) { return false; }
}

// ---- chuyển dữ liệu bản cũ, dọn khoá cũ (mỗi lượt chỉ tốn 4 getItem khi không còn gì để chuyển) ----
function purgeLegacyStorage() {
    try {
        if (qtHas("qtrans3_context")) localStorage.removeItem("qtrans3_context");
        var raw = qtHas("vbook_cache_manifest") ? localStorage.getItem("vbook_cache_manifest") : null;
        if (raw !== null) {
            var manifest = JSON.parse(String(raw)) || [];
            for (var i = 0; i < manifest.length; i++) {
                if (manifest[i] && manifest[i].key) localStorage.removeItem(manifest[i].key);
            }
            localStorage.removeItem("vbook_cache_manifest");
        }
    } catch (e) {}
    try { migrateV19(); } catch (e2) {}
}

// Sổ truyện cũ tách thành từng truyện (tên chương cắt còn 1.500); recent/chunks cũ chỉ sống 45 phút/6 giờ nên bỏ.
function migrateV19() {
    var old = qtLoad(QT3_BOOKS_OLD, null, true);
    if (old && old.b) {
        var store = booksLoad();
        for (var id in old.b) {
            var bk = old.b[id];
            if (!bk || store.b[id]) continue;
            var titles = {}, n = 0;
            for (var h in (bk.titles || {})) {
                if (n >= TITLES_PER_BOOK) break;
                titles[h] = bk.titles[h]; n++;
            }
            store.b[id] = { titles: titles, ctx: bk.ctx || null, tails: bk.tails || {}, g: bk.g || null, used: bk.used || qtNow() };
            store.dirty[id] = true;
        }
        if (old.last && !store.last) store.last = old.last;
        booksSave(store);
        qtRemove(QT3_BOOKS_OLD);
    }
    try {
        if (qtHas(QT3_RECENT_OLD)) qtRemove(QT3_RECENT_OLD);
        if (qtHas(QT3_CHUNKS_OLD)) qtRemove(QT3_CHUNKS_OLD);
    } catch (e) {}
}

function purgeAllCaches() {
    purgeLegacyStorage();
    var cidx = qtLoad(QT3_CIDX, { items: [] }, true);
    for (var i = 0; i < cidx.items.length; i++) qtRemove(QT3_ENTRY + cidx.items[i][0]);
    var bidx = qtLoad(QT3_BIDX, { ids: [] }, true);
    for (var j = 0; j < (bidx.ids || []).length; j++) qtRemove(QT3_BOOK + bidx.ids[j]);
    qtRemove(QT3_CIDX);
    qtRemove(QT3_BIDX);
    qtRemove(QT3_LINES);
    qtRemove(QT3_INFLIGHT);
    qtMem = {};
}

// ---- bản dịch chương / đoạn: mỗi mục một khoá ----
function entryGet(key) {
    // Đọc tươi: lượt khác có thể vừa ghi xong (waitForSameRequest thăm dò mục này).
    var e = qtLoad(QT3_ENTRY + key, null, true);
    if (!e || typeof e.v !== "string") return null;
    if (qtNow() - (e.t || 0) > ENTRY_TTL) return null;
    return e.v;
}

function entryPut(key, value) {
    var v = String(value), now = qtNow();
    qtSave(QT3_ENTRY + key, { v: v, t: now });
    var idx = qtLoad(QT3_CIDX, { items: [] }, true);
    var items = [[key, now, v.length]], total = v.length, seen = {};
    seen[key] = true;
    for (var i = 0; i < idx.items.length; i++) {
        var it = idx.items[i];
        if (!it || seen[it[0]]) continue;
        if (now - it[1] > ENTRY_TTL || items.length >= ENTRY_MAX || total + it[2] > ENTRY_CHARS) {
            qtRemove(QT3_ENTRY + it[0]);
            continue;
        }
        items.push(it); total += it[2]; seen[it[0]] = true;
    }
    qtSave(QT3_CIDX, { items: items });
}

// Giữ tên cũ cho translate.js: chương vừa dịch ("r") và từng đoạn ("k") cùng một kho.
function recentGet(key) { return entryGet("r" + key); }
function recentPut(key, value) { entryPut("r" + key, value); }
function chunkGet(key) { return entryGet("k" + key); }
function chunkPut(key, value) { entryPut("k" + key, value); }

// ---- chống gọi trùng song song ----
function inflightSet(key, on) {
    var store = qtLoad(QT3_INFLIGHT, {}, true);
    var now = qtNow();
    var next = {};
    for (var k in store) {
        if (now - store[k] < INFLIGHT_TTL && k !== key) next[k] = store[k];
    }
    if (on) next[key] = now;
    qtSave(QT3_INFLIGHT, next);
}

// Có lượt khác đang dịch đúng nội dung này: chờ kết quả của nó thay vì gọi API lần nữa.
function waitForSameRequest(key) {
    var store = qtLoad(QT3_INFLIGHT, {}, true);
    var started = store[key];
    if (!started || qtNow() - started > INFLIGHT_TTL) return null;
    var deadline = Math.min(qtNow() + INFLIGHT_WAIT, started + INFLIGHT_TTL);
    try { logStep("chờ lượt trùng đang dịch"); } catch (e0) {}
    while (qtNow() < deadline) {
        try { sleep(1500); } catch (e) { return null; }
        var done = recentGet(key);
        if (done !== null) return done;
        var cur = qtLoad(QT3_INFLIGHT, {}, true)[key];
        if (!cur) return recentGet(key);
    }
    return null;
}

// Danh sách (mục lục…): vBook có lúc gửi cùng một danh sách 2–3 lượt cùng lúc. Lượt sau chờ lượt đầu xong (tối đa
// 40 giây) rồi đọc cache theo dòng, không gọi API lần nữa.
function waitForSameList(key) {
    var store = qtLoad(QT3_INFLIGHT, {}, true);
    var started = store[key];
    if (!started || qtNow() - started > INFLIGHT_TTL) return;
    try { logStep("chờ lượt danh sách trùng"); } catch (e0) {}
    var deadline = Math.min(qtNow() + INFLIGHT_WAIT, started + INFLIGHT_TTL);
    while (qtNow() < deadline) {
        try { sleep(1000); } catch (e) { return; }
        if (!qtLoad(QT3_INFLIGHT, {}, true)[key]) return;
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

// Sổ truyện: chỉ mục + mỗi truyện một khoá. Trong một lượt chỉ dựng một lần; booksSave chỉ ghi truyện có sửa (dirty).
function booksLoad() {
    if (qtMem.__books) return qtMem.__books;
    var idx = qtLoad(QT3_BIDX, { ids: [], last: null });
    var store = { b: {}, last: idx.last || null, dirty: {} };
    var ids = idx.ids || [];
    for (var i = 0; i < ids.length; i++) {
        var bk = qtLoad(QT3_BOOK + ids[i], null);
        if (bk && bk.titles) store.b[ids[i]] = bk;
    }
    qtMem.__books = store;
    return store;
}

function booksSave(store) {
    var now = qtNow();
    var ids = [];
    for (var id in store.b) {
        if (now - (store.b[id].used || 0) > BOOK_TTL) { qtRemove(QT3_BOOK + id); delete store.b[id]; }
        else ids.push(id);
    }
    if (ids.length > BOOKS_MAX) {
        ids.sort(function(a, b) { return (store.b[a].used || 0) - (store.b[b].used || 0); });
        var drop = ids.splice(0, ids.length - BOOKS_MAX);
        for (var d = 0; d < drop.length; d++) { qtRemove(QT3_BOOK + drop[d]); delete store.b[drop[d]]; }
    }
    for (var k in store.dirty) {
        if (store.b[k]) qtSave(QT3_BOOK + k, store.b[k]);
    }
    store.dirty = {};
    qtSave(QT3_BIDX, { ids: ids, last: store.last || null });
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
    store.dirty[bookId] = true;
    store.last = { id: bookId, at: qtNow() };
    booksSave(store);
    return bookId;
}

// Nguồn nào cũng có thể không lặp tên chương ở đầu nội dung (đã gặp: chương mở thẳng bằng câu văn). Khi đó
// không tra được tên trong mục lục, và cũng không biết số chương. Bản ≤ 17 bỏ luôn ngữ cảnh; bản 18 đoán theo
// truyện vừa có mục lục/chương đi qua, kèm hai rào: hết hạn sau LAST_BOOK_TTL và chương phải có ít nhất một tên
// riêng của truyện đó (sổ tên chương trước) để không nối nhầm sang truyện khác đang đọc song song.
function looksLikeSameBook(book, text) {
    var glossary = book && book.ctx && book.ctx.gv === 2 ? book.ctx.glossary : null;
    if (!glossary) return true;
    var seen = 0;
    for (var k in glossary) {
        seen++;
        if (String(text).indexOf(k) > -1) return true;
    }
    return seen === 0;
}

// Chương đang dịch thuộc truyện nào: tra tiêu đề trong 5 dòng đầu; không thấy thì đoán theo truyện gần nhất.
function findBookForChapter(text) {
    var lines = String(text).split("\n");
    var heads = [];
    for (var i = 0; i < lines.length && heads.length < 5; i++) {
        if (lines[i].trim()) heads.push(lines[i].trim());
    }
    var store = booksLoad();
    for (var p = 0; p < heads.length; p++) {
        var h = qtHash(normTitle(heads[p]));
        for (var id in store.b) {
            var titles = store.b[id].titles || {};
            if (titles[h] === undefined) continue;
            var num = chapterNumber(heads[p]);
            rememberBook(id);
            return { id: id, num: num !== null ? num : titles[h] };
        }
    }
    var last = store.last;
    if (!last || !store.b[last.id] || qtNow() - (last.at || 0) > LAST_BOOK_TTL) return null;
    if (!looksLikeSameBook(store.b[last.id], text)) return null;
    rememberBook(last.id);
    return { id: last.id, num: null, guessed: true };
}

// Truyện vừa được dùng: chỉ đổi chỉ mục, không ghi lại truyện nào. Nếu lượt này còn ghi đuôi/điểm thì booksSave sau
// đó ghi luôn một thể.
function rememberBook(id) {
    var store = booksLoad();
    if (!store.b[id]) return;
    store.last = { id: id, at: qtNow() };
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
        // Bản ≤ 15 chỉ có một ô ctx; đọc nốt cho lần đầu sau khi cập nhật.
        if (!tail && ctx && ctx.num !== null && ctx.num === ref.num - 1) tail = String(ctx.tail || "");
        // Lượt liền trước là lượt đoán (không biết số chương) và vừa xong: coi như chương kề trước.
        if (!tail && ctx && ctx.num === null && qtNow() - (ctx.at || 0) < CHAIN_TTL) tail = String(ctx.tail || "");
    } else if (ctx && qtNow() - (ctx.at || 0) < CHAIN_TTL) {
        // Không biết số chương (nguồn không lặp tên chương): nối đuôi của lượt ngay trước nếu vừa mới dịch.
        tail = String(ctx.tail || "");
    }
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
    book.ctx = { tail: tail, glossary: glossary, num: ref.num === undefined ? null : ref.num, gv: 2, at: qtNow() };
    book.used = qtNow();
    store.dirty[ref.id] = true;
    store.last = { id: ref.id, at: qtNow() };
    booksSave(store);
}

// ---- thể loại truyện (chọn văn phong tự động) ----
// Điểm thể loại cộng dồn qua từng chương của cùng truyện: một chương lạc đề không đổi được văn phong của cả bộ,
// và càng đọc thì càng chắc. Không có truyện (chưa gặp mục lục) thì chỉ dùng điểm của chương đang dịch.
// Chỉ cộng vào bản trong bộ nhớ; bookContextPut ở cuối lượt ghi luôn (lượt bị ngắt thì mất điểm của chương đó, chấp nhận).
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
    store.dirty[ref.id] = true;
    if (ref.num === null && ref.guessed !== true) booksSave(store); // mục lục: không có bookContextPut theo sau
    return total;
}

// ---- nhật ký ----
var logId = null;
var logStartedAt = 0;

function logStart(extra, length) {
    logStartedAt = qtNow();
    logId = logStartedAt.toString(36);
    var store = qtLoad(QT3_LOG, { items: [] }, true);
    store.items.unshift({ id: logId, at: new Date(logStartedAt).toISOString(), extra: String(extra), len: length, step: "bắt đầu", s: 0 });
    store.items = store.items.slice(0, LOG_MAX);
    qtSave(QT3_LOG, store);
}

function logStep(step) {
    if (!logId) return;
    var store = qtLoad(QT3_LOG, { items: [] }, true);
    for (var i = 0; i < store.items.length; i++) {
        if (store.items[i].id === logId) {
            store.items[i].step = String(step).substring(0, 200);
            store.items[i].s = Math.round((qtNow() - logStartedAt) / 100) / 10;
            break;
        }
    }
    qtSave(QT3_LOG, store);
}
