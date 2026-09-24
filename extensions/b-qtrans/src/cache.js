// Bộ nhớ của Q-trans 3 (bản 19, chẩn đoán bản 20). Mọi mục đều có giới hạn; người dùng xoá bằng tay ở trang tiện ích › Bộ nhớ cục bộ.
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
// Tên tác phẩm 《…》 đã dịch của truyện: khoá một cách gọi cho cả bộ.
var WORKS_MAX = 200;
// Đuôi ngữ cảnh giữ theo SỐ CHƯƠNG: vBook tải trước 10 chương nên chương vừa dịch xong thường không phải chương
// người đọc mở kế tiếp.
var TAILS_MAX = 12;
// Đoán truyện theo lượt gần nhất (bản 18): mục lục/chương của truyện đó phải mới đi qua trong 30 phút.
var LAST_BOOK_TTL = 30 * 60 * 1000;
// Không biết số chương thì chỉ nối đuôi khi chương trước của truyện đó vừa dịch xong trong 15 phút.
var CHAIN_TTL = 15 * 60 * 1000;
// Bản 22: nhận truyện bằng tên lặp qua nhiều chương của CHÍNH truyện đó. Bảng tên QT (glossary) đầy từ chung
// (地球, 电视, 凌晨, 穿越, 皇帝…) nên chương nào cũng "trúng tên" truyện khác — log iPhone 23/9: mở mục lục truyện võ
// hiệp lúc 13:44Z là 55/62 chương đô thị kế tiếp bị gán sang nó và nhận văn phong cổ trang. Mỗi truyện giữ bộ tên
// có mặt trong NAME_RING chương gần nhất; tên "then chốt" = xuất hiện ở ≥ NAME_MIN_CHAPTERS chương.
var NAME_RING = 12;
var NAME_MIN_CHAPTERS = 3;
var NAMES_PER_CHAPTER = 40;
// Điểm thể loại của mục lục ép về cỡ một chương: mục lục 500 tên chương (≈ 60 điểm) từng át mọi chương của truyện,
// nhất là truyện mà chương không lặp tên chương nên không bao giờ cộng dồn được.
var TOC_SCORE_MAX = 12;
// Sổ truyện lên bản 22 thì xoá điểm thể loại cũ: bản 18–20 cộng cả chương đoán nhầm truyện vào (truyện võ hiệp
// 林风 vẫn nhận văn phong hiện đại ở bản 21 vì điểm đô thị nhiễm từ trước).
var BOOKS_SCHEMA = 22;
// Tên + giới thiệu truyện: vBook gửi dịch ngay trước mục lục (log 22–23/9: "全职艺术家 / 怀揣系统…", "武侠：最强肉身…").
// Giữ tạm INTRO_TTL để gắn vào truyện khi mục lục tới. Thể loại của truyện CHỐT một lần khi mục lục + giới thiệu đủ
// điểm, hoặc khi điểm chương cộng dồn đủ rõ (genreDecide); chương sau chỉ tra, không chấm lại (yêu cầu người dùng 23/9).
var QT3_INTRO = "qtrans3_intro";
// Giới thiệu và mục lục của cùng truyện đến cách nhau 0–3 giây; mở hai truyện liền nhau thì giới thiệu truyện sau ghi đè.
var INTRO_TTL = 20 * 1000;
var GENRE_LOCK_MIN = 8;
var GENRE_LOCK_SUM_MAX = 60;

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
    qtRemove(QT3_INTRO);
    qtMem = {};
}

// ---- chẩn đoán gửi kèm header x-qtrans-diag của request (Cedric ghi header vào log). Trên iPhone không có
// cách nào khác đọc localStorage của tiện ích; đây là kênh duy nhất để biết bộ nhớ có giữ được giữa các lượt không.
var QT3_PROBE = "qtrans3_probe";
var QT3_VERSION = 24;
var qtDiag = { n: 0, prev: -1, wr: "?", miss: "", bk: "" };

// Ghi dấu lượt rồi đọc lại ngay (wr) và đo tuổi dấu của lượt trước (prev, giây): prev luôn -1 nghĩa là ghi không
// giữ được sang lượt sau.
function qtProbe() {
    var now = qtNow();
    var prev = qtLoad(QT3_PROBE, null, true);
    qtDiag.prev = prev && prev.t ? Math.round((now - prev.t) / 1000) : -1;
    qtDiag.n = prev && prev.n ? prev.n + 1 : 1;
    qtDiag.miss = "";
    qtDiag.bk = "";
    qtSave(QT3_PROBE, { t: now, n: qtDiag.n });
    var back = qtLoad(QT3_PROBE, null, true);
    qtDiag.wr = back && back.t === now ? "ok" : "bad";
}

function qtDiagString() {
    var out = "v" + QT3_VERSION + " n=" + qtDiag.n + " prev=" + qtDiag.prev + " wr=" + qtDiag.wr + " miss=" + (qtDiag.miss || "-");
    try {
        var cidx = qtLoad(QT3_CIDX, { items: [] }), bidx = qtLoad(QT3_BIDX, { ids: [] });
        var total = 0;
        for (var i = 0; i < cidx.items.length; i++) total += cidx.items[i][2] || 0;
        out += " c=" + cidx.items.length + "/" + total + " b=" + (bidx.ids || []).length;
        // Danh sách dòng chỉ đếm khi lượt này đã nạp (đường chương không nạp nó).
        if (Object.prototype.hasOwnProperty.call(qtMem, QT3_LINES)) {
            var lc = 0;
            for (var k in (qtMem[QT3_LINES].m || {})) lc++;
            out += " l=" + lc;
        }
    } catch (e) {}
    // bk: truyện được nhận (5 ký tự id) và cách nhận (ten/chac/doan/none); g: văn phong auto đã chọn.
    var genre = typeof lastGenre !== "undefined" && lastGenre ? String(lastGenre.chon).replace("vi_", "") + (lastGenre.khoa ? "!" : "") : "-";
    return out + " r=" + qtStats.reads + " w=" + qtStats.writes + " bk=" + (qtDiag.bk || "-") + " g=" + genre;
}

// ---- bản dịch chương / đoạn: mỗi mục một khoá ----
function entryGet(key) {
    // Đọc tươi: lượt khác có thể vừa ghi xong (waitForSameRequest thăm dò mục này).
    var e = qtLoad(QT3_ENTRY + key, null, true);
    if (!e || typeof e.v !== "string") { qtDiag.miss = qtDiag.miss || "none"; return null; }
    if (qtNow() - (e.t || 0) > ENTRY_TTL) { qtDiag.miss = "exp"; return null; }
    qtDiag.miss = "hit";
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
    qtDiag.miss = "wait";
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
    if ((idx.v || 0) < BOOKS_SCHEMA) {
        for (var m in store.b) { delete store.b[m].g; store.dirty[m] = true; }
        store.noMerge = true;
        booksSave(store);
        store.noMerge = false;
    }
    return store;
}

// Truyện lượt khác vừa thêm vào chỉ mục (mục lục mở song song) mà lượt này chưa nạp.
function booksRefresh(store) {
    var disk = qtLoad(QT3_BIDX, { ids: [] }, true);
    var added = 0, ids = (disk && disk.ids) || [];
    for (var i = 0; i < ids.length; i++) {
        if (store.b[ids[i]]) continue;
        var bk = qtLoad(QT3_BOOK + ids[i], null, true);
        if (bk && bk.titles) { store.b[ids[i]] = bk; added++; }
    }
    return added;
}

// Gộp bản trên đĩa (lượt khác vừa ghi) vào bản của lượt này trước khi ghi đè. vBook chạy 2 lượt song song và mỗi lượt
// giữ bản đọc lúc đầu; bản 22–23 ghi đè cả cục nên mất khoá thể loại vừa chốt, tên chương, bộ tên của lượt kia.
function bookMerge(b, d) {
    if (!d || !d.titles) return;
    if (!b.genre && d.genre) b.genre = d.genre;
    if (!b.title && d.title) b.title = d.title;
    b.titles = b.titles || {};
    var n = 0;
    for (var h in b.titles) n++;
    for (var h2 in d.titles) { if (b.titles[h2] === undefined && n < TITLES_PER_BOOK) { b.titles[h2] = d.titles[h2]; n++; } }
    if (d.tails) {
        b.tails = b.tails || {};
        for (var t in d.tails) { if (b.tails[t] === undefined) b.tails[t] = d.tails[t]; }
        var nums = [];
        for (var t2 in b.tails) nums.push(parseInt(t2, 10));
        if (nums.length > TAILS_MAX) {
            nums.sort(function(x, y) { return x - y; });
            for (var k = 0; k < nums.length - TAILS_MAX; k++) delete b.tails[String(nums[k])];
        }
    }
    if (d.nr && d.nr.length) {
        var ring = b.nr || [], have = {}, missing = [];
        for (var r = 0; r < ring.length; r++) have[ring[r].h] = true;
        for (var r2 = 0; r2 < d.nr.length; r2++) { if (!have[d.nr[r2].h]) missing.push(d.nr[r2]); }
        ring = missing.concat(ring);
        if (ring.length > NAME_RING) ring.splice(0, ring.length - NAME_RING);
        b.nr = ring;
    }
    if (d.works) {
        b.works = b.works || {};
        for (var w in d.works) { if (b.works[w] === undefined) b.works[w] = d.works[w]; }
    }
    if (d.g) {
        b.g = b.g || {};
        for (var g in d.g) { if ((d.g[g] || 0) > (b.g[g] || 0)) b.g[g] = d.g[g]; }
    }
    if (d.ctx && (!b.ctx || (d.ctx.at || 0) > (b.ctx.at || 0))) b.ctx = d.ctx;
    if ((d.used || 0) > (b.used || 0)) b.used = d.used;
}

// Bản 24: chỉ mục ghi theo bản mới nhất trên đĩa. Log iPhone 24/9 10:07: mở hai truyện mới cùng lúc, hai mục lục thêm
// hai truyện (b 4→6), rồi các lượt dịch chương đã nạp chỉ mục từ trước ghi lại danh sách cũ → hai truyện biến mất khỏi
// chỉ mục (b=4 lúc 11:29) và chương của chúng bị đoán sang truyện khác (李随风 vào sổ truyện 林风, 秦长生 vào một truyện cũ).
function booksSave(store) {
    var now = qtNow();
    var ids = [], removed = store.removed || (store.removed = {});
    for (var id in store.b) {
        if (now - (store.b[id].used || 0) > BOOK_TTL) { qtRemove(QT3_BOOK + id); delete store.b[id]; removed[id] = true; }
        else ids.push(id);
    }
    var extra = [];
    if (!store.noMerge) {
        var disk = qtLoad(QT3_BIDX, { ids: [] }, true);
        var diskIds = (disk && disk.ids) || [];
        for (var e = 0; e < diskIds.length; e++) {
            var x = diskIds[e];
            if (!store.b[x] && !removed[x] && extra.indexOf(x) < 0 && qtHas(QT3_BOOK + x)) extra.push(x);
        }
    }
    if (ids.length + extra.length > BOOKS_MAX) {
        ids.sort(function(a, b) { return (store.b[a].used || 0) - (store.b[b].used || 0); });
        var drop = ids.splice(0, Math.min(ids.length, ids.length + extra.length - BOOKS_MAX));
        for (var d = 0; d < drop.length; d++) { qtRemove(QT3_BOOK + drop[d]); delete store.b[drop[d]]; removed[drop[d]] = true; }
    }
    for (var k in store.dirty) {
        if (!store.b[k]) continue;
        if (!store.noMerge) bookMerge(store.b[k], qtLoad(QT3_BOOK + k, null, true));
        qtSave(QT3_BOOK + k, store.b[k]);
    }
    store.dirty = {};
    qtSave(QT3_BIDX, { ids: ids.concat(extra), last: store.last || null, v: BOOKS_SCHEMA });
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
    try { introAttach(book); } catch (eI) {}
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
// Số tên riêng (bảng Name của truyện) xuất hiện trong chương; known=false khi truyện chưa có bảng tên.
function bookNameHits(book, text) {
    var glossary = book && book.ctx && book.ctx.gv === 2 ? book.ctx.glossary : null;
    var hits = 0, seen = 0, s = String(text);
    for (var k in (glossary || {})) {
        seen++;
        if (k.length >= 2 && s.indexOf(k) > -1) hits++;
    }
    return { hits: hits, known: seen > 0 };
}

// Tên nhân vật lấy thẳng từ chữ: họ phổ biến + 1 chữ, lặp ≥ NAME_MIN_HITS lần trong chương (nhân vật chính xuất hiện
// hàng chục lần). Không trông vào từ điển Name của QT: trên máy ảo 23/9 từ điển không có 林渊 nên sau 3 chương bộ tên
// của 全职艺术家 chỉ có 楚狂/鲁阳 và chương kế bị gán sang truyện võ hiệp vừa mở.
var NAME_MIN_HITS = 4;
var SURNAMES = "王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤楚蓝叶洛柳慕容欧阳司徒上官诸葛南宫东方独孤令狐宇文长孙凌沐夜云风花月墨白苏叶秦楚";
var NAME_STOP = "的了是在和与也都就不有我你他她它们说道着过上下来去到把被给对从向里中后前时人个这那之而以为又才很更最还但却并及因所么呢吧啊哦嗯没会能要将让使被等";
function textNameCandidates(text) {
    var s = String(text), count = {}, out = [];
    for (var i = 0; i + 1 < s.length; i++) {
        var c1 = s.charCodeAt(i), c2 = s.charCodeAt(i + 1);
        if (c1 < 0x4e00 || c1 > 0x9fff || c2 < 0x4e00 || c2 > 0x9fff) continue;
        var a = s.charAt(i), b = s.charAt(i + 1);
        if (SURNAMES.indexOf(a) < 0 || NAME_STOP.indexOf(b) > -1 || NAME_STOP.indexOf(a) > -1) continue;
        var w = a + b;
        count[w] = (count[w] || 0) + 1;
    }
    for (var k in count) { if (count[k] >= NAME_MIN_HITS) out.push([k, count[k]]); }
    out.sort(function(x, y) { return y[1] - x[1]; });
    var names = [];
    for (var j = 0; j < out.length && j < 15; j++) names.push(out[j][0]);
    return names;
}

// Bộ tên của NAME_RING chương gần nhất: mỗi chương một mục {h: hash đầu chương, n: [tên]} — tên lấy từ chữ trước, rồi
// tên trong bảng tên (QT) có mặt trong chương.
function nameRingPush(book, glossary, source) {
    var strong = textNameCandidates(source);
    var present = strong.slice();
    for (var k in glossary) {
        if (present.length >= NAMES_PER_CHAPTER) break;
        if (k.length >= 2 && source.indexOf(k) > -1 && present.indexOf(k) < 0) present.push(k);
    }
    if (present.length === 0) return;
    var ring = book.nr || [];
    // Cùng chương dịch lại (lượt song song/thử lại trên iPhone) nhận ra bằng hash 200 ký tự đầu: gộp, không đếm hai lần.
    var h = qtHash(String(source).substring(0, 200));
    for (var r = 0; r < ring.length; r++) {
        if (ring[r].h !== h) continue;
        for (var i = 0; i < present.length; i++) {
            if (ring[r].n.indexOf(present[i]) < 0 && ring[r].n.length < NAMES_PER_CHAPTER) ring[r].n.push(present[i]);
        }
        for (var i2 = 0; i2 < strong.length; i2++) { if ((ring[r].t || []).indexOf(strong[i2]) < 0) { ring[r].t = ring[r].t || []; ring[r].t.push(strong[i2]); } }
        book.nr = ring;
        return;
    }
    ring.push({ h: h, n: present, t: strong });
    if (ring.length > NAME_RING) ring.splice(0, ring.length - NAME_RING);
    book.nr = ring;
}

// Tên then chốt của truyện: có mặt ở ≥ NAME_MIN_CHAPTERS chương và ≥ 60% số chương trong bộ (mới có 2 chương thì phải ở
// cả hai). Tên lấy từ chữ (nhân vật lặp nhiều lần) nặng 1; tên chỉ đến từ bảng tên QT (hay là từ chung: 皇帝, 地球) nặng 0,5.
function bookKeyNames(book) {
    var ring = (book && book.nr) || [];
    var count = {}, strong = {}, out = {};
    for (var i = 0; i < ring.length; i++) {
        var names = ring[i].n || [], t = ring[i].t || [];
        for (var j = 0; j < names.length; j++) count[names[j]] = (count[names[j]] || 0) + 1;
        for (var j2 = 0; j2 < t.length; j2++) strong[t[j2]] = (strong[t[j2]] || 0) + 1;
    }
    var need = ring.length >= NAME_MIN_CHAPTERS ? Math.max(NAME_MIN_CHAPTERS, Math.ceil(ring.length * 0.6)) : (ring.length >= 2 ? ring.length : 0);
    if (need === 0) return out;
    for (var k in count) { if (count[k] >= need) out[k] = (strong[k] || 0) >= need ? 1 : 0.5; }
    return out;
}

// Bản 18 chỉ xét truyện dùng gần nhất; bản 21 chấm theo bảng tên QT — cả hai đều gán nhầm khi đọc hai truyện
// song song (xem ghi chú đầu file). Bản 22: chấm mọi truyện vừa dùng theo số tên THEN CHỐT của nó có trong chương,
// tên thuộc bộ của ≥ 2 truyện là từ chung và không tính cho ai. Truyện vừa mở chưa có bộ tên chỉ nhận chương khi
// không truyện nào khác trúng tên và nó là lượt gần nhất. Trả {id, sure}: sure = trội hẳn, được cộng điểm thể loại.
function guessBook(store, text, noBootstrap) {
    // Bản 22 chỉ xét truyện dùng trong 30 phút và bỏ cuộc khi lượt gần nhất quá hạn: log iPhone 24/9 sau một đêm nghỉ, truyện
    // võ hiệp (nguồn không lặp tên chương) không bao giờ được xét lại vì không có gì làm mới `used` → 60 chương "none".
    // Bản 23: xét mọi truyện trong sổ (≤ BOOKS_MAX), thời gian chỉ dùng để ưu tiên.
    var last = store.last;
    var s = String(text);
    var cands = [];
    for (var id in store.b) {
        var book = store.b[id];
        var keys = bookKeyNames(book), hasKeys = false;
        for (var kk in keys) { hasKeys = true; break; }
        cands.push({ id: id, book: book, keys: keys, hasKeys: hasKeys, score: 0 });
    }
    if (cands.length === 0) return null;
    var owners = {};
    for (var c = 0; c < cands.length; c++) { for (var k in cands[c].keys) owners[k] = (owners[k] || 0) + 1; }
    var best = null, second = null;
    for (var c2 = 0; c2 < cands.length; c2++) {
        var cand = cands[c2];
        for (var k2 in cand.keys) { if (owners[k2] === 1 && s.indexOf(k2) > -1) cand.score += cand.keys[k2]; }
        if (!best || cand.score > best.score) { second = best; best = cand; }
        else if (!second || cand.score > second.score) second = cand;
    }
    if (!best) return null;
    var secondScore = second ? second.score : 0;
    // Trội hẳn: gấp đôi truyện nhì hoặc hơn 3 điểm; "chắc" (được cộng điểm thể loại) từ 2,5 điểm khi gấp ba hoặc hơn 4.
    if (best.score >= 2 && (best.score >= 2 * secondScore || best.score - secondScore >= 3)) {
        return { id: best.id, sure: best.score >= 2.5 && (best.score >= 3 * secondScore || best.score - secondScore >= 4) };
    }
    // Trúng một tên mà truyện khác không trúng tên nào: nhận nhưng chưa chắc (truyện mới bộ tên còn mỏng).
    if (best.score >= 1 && secondScore === 0) return { id: best.id, sure: false };
    if (best.score >= 1) return null;
    // Dưới 1 điểm (chỉ trúng từ chung nửa điểm) coi như không trúng.
    // Không truyện nào trúng tên then chốt. Truyện chưa có bộ tên (vừa mở, hoặc vừa lên bản mới) nhận chương để bắt đầu
    // học: xếp theo số tên trong bảng tên thường có mặt, rồi theo lượt dùng gần nhất. Bản 22 bỏ qua truyện có bảng tên mà
    // không trúng chữ nào → truyện có bảng tên cũ (bản 21) không bao giờ được nhận chương, không học được bộ tên (iPhone
    // 23/9: 20 chương 全职艺术家 liền "none").
    if (noBootstrap) return null;
    var pick = null;
    for (var c3 = 0; c3 < cands.length; c3++) {
        var cand2 = cands[c3];
        if (cand2.hasKeys) continue;
        var r = bookNameHits(cand2.book, s);
        var used = cand2.book.used || 0;
        if (last && last.id === cand2.id && (last.at || 0) > used) used = last.at;
        if (!pick || r.hits > pick.hits || (r.hits === pick.hits && used > pick.used)) pick = { id: cand2.id, hits: r.hits, used: used };
    }
    return pick ? { id: pick.id, sure: false } : null;
}

// Chương đang dịch thuộc truyện nào: tra tiêu đề trong 5 dòng đầu; không thấy thì đoán theo truyện gần nhất.
function findBookForChapter(text) {
    var lines = String(text).split("\n");
    var heads = [];
    for (var i = 0; i < lines.length && heads.length < 5; i++) {
        if (lines[i].trim()) heads.push(lines[i].trim());
    }
    var store = booksLoad();
    var titled = false;
    for (var p0 = 0; p0 < heads.length; p0++) { if (chapterNumber(heads[p0]) !== null) { titled = true; break; } }
    // Lần hai: nạp thêm truyện lượt khác vừa đăng ký (mục lục đang dịch song song với chương đầu tiên).
    for (var pass = 0; pass < 2; pass++) {
        for (var p = 0; p < heads.length; p++) {
            var h = qtHash(normTitle(heads[p]));
            for (var id in store.b) {
                var titles = store.b[id].titles || {};
                if (titles[h] === undefined) continue;
                var num = chapterNumber(heads[p]);
                rememberBook(id);
                qtDiag.bk = id.substring(1, 6) + ":ten";
                return { id: id, num: num !== null ? num : titles[h] };
            }
        }
        if (pass === 0 && (!titled || booksRefresh(store) === 0)) break;
    }
    // Chương có tên chương mà không có trong mục lục nào: truyện mới/chưa qua mục lục. Chỉ nhận theo tên nhân vật, không
    // "bootstrap" vào truyện chưa có bộ tên (bản 23 gán 第1章 của truyện mới sang sổ truyện 林风).
    var guessed = guessBook(store, text, titled);
    qtDiag.bk = guessed ? guessed.id.substring(1, 6) + (guessed.sure ? ":chac" : ":doan") : (titled ? "moi" : "none");
    if (!guessed) return null;
    rememberBook(guessed.id);
    return { id: guessed.id, num: null, guessed: true, sure: guessed.sure === true };
}

// Truyện vừa được dùng: chỉ đổi chỉ mục, không ghi lại truyện nào. Nếu lượt này còn ghi đuôi/điểm thì booksSave sau
// đó ghi luôn một thể.
function rememberBook(id) {
    var store = booksLoad();
    if (!store.b[id]) return;
    store.last = { id: id, at: qtNow() };
}

function bookContextGet(ref) {
    if (!ref) return { tail: "", glossary: {}, works: {}, tailUsed: false };
    var book = booksLoad().b[ref.id];
    if (!book) return { tail: "", glossary: {}, works: {}, tailUsed: false };
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
    return { tail: tail, glossary: glossary, works: book.works || {}, tailUsed: tail !== "" };
}

// ---- tên tác phẩm 《…》 ----
// Log Cedric 22/9 (全职艺术家, 592 chương): 73/164 tác phẩm bị dịch 2–5 cách (《东方快车谋杀案》 5 cách), chỉ hai tên có
// trong ví dụ của prompt là ổn định. Ghép 《X》 của dòng gốc với "…" của dòng dịch khi số dòng và số ngoặc khớp, lưu
// theo truyện (lần đầu thắng), gửi lại trong Ngữ cảnh và sửa thẳng bản dịch nếu model vẫn đổi tên.
var WORK_ZH = /《([^《》\n]{1,60})》/g;
var WORK_VI = /["\u201c\u00ab]([^"\u201c\u201d\u00ab\u00bb\n]{1,80})["\u201d\u00bb]/g;

function qtNonBlankLines(text) {
    var out = [], lines = String(text).split("\n");
    for (var i = 0; i < lines.length; i++) if (lines[i].trim()) out.push(lines[i]);
    return out;
}

function qtMatchAll(re, s) {
    var out = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(s)) !== null) out.push(m);
    return out;
}

// Dòng dịch có lời thoại trong “…” thì số ngoặc lệch với số 《》 → bỏ qua dòng đó, không đoán.
function worksPairsOfLine(src, dst) {
    var zh = qtMatchAll(WORK_ZH, src);
    if (zh.length === 0) return [];
    var vi = qtMatchAll(WORK_VI, dst);
    if (vi.length !== zh.length) return [];
    var pairs = [];
    for (var i = 0; i < zh.length; i++) {
        var name = vi[i][1].trim();
        if (!name || /[.!?;:…]/.test(name)) return [];
        pairs.push([zh[i][1], name, vi[i]]);
    }
    return pairs;
}

function worksLearn(book, source, translated) {
    if (!book.works) book.works = {};
    var count = 0;
    for (var c in book.works) count++;
    var s = qtNonBlankLines(source), t = qtNonBlankLines(translated);
    if (s.length !== t.length) return 0;
    var added = 0;
    for (var i = 0; i < s.length && count < WORKS_MAX; i++) {
        var pairs = worksPairsOfLine(s[i], t[i]);
        for (var j = 0; j < pairs.length && count < WORKS_MAX; j++) {
            if (book.works[pairs[j][0]] !== undefined) continue;
            book.works[pairs[j][0]] = pairs[j][1];
            count++; added++;
        }
    }
    return added;
}

var worksApplied = 0;

// Thay tên tác phẩm trong bản dịch bằng tên đã khoá của truyện; chỉ đụng dòng ghép được chắc chắn.
function worksApply(works, source, translated) {
    worksApplied = 0;
    if (!works) return translated;
    var any = false;
    for (var w in works) { any = true; break; }
    if (!any) return translated;
    var s = qtNonBlankLines(source), lines = String(translated).split("\n");
    var t = [];
    for (var i = 0; i < lines.length; i++) if (lines[i].trim()) t.push(i);
    if (s.length !== t.length) return translated;
    for (var k = 0; k < s.length; k++) {
        var pairs = worksPairsOfLine(s[k], lines[t[k]]);
        if (pairs.length === 0) continue;
        var line = lines[t[k]], out = "", pos = 0;
        for (var p = 0; p < pairs.length; p++) {
            var want = works[pairs[p][0]], m = pairs[p][2];
            if (want === undefined || want === pairs[p][1]) continue;
            var open = m[0].charAt(0), close = m[0].charAt(m[0].length - 1);
            out += line.substring(pos, m.index) + open + want + close;
            pos = m.index + m[0].length;
            worksApplied++;
        }
        if (pos > 0) lines[t[k]] = out + line.substring(pos);
    }
    return lines.join("\n");
}

function bookContextPut(ref, translated, glossary, source) {
    if (!ref) return;
    var store = booksLoad();
    var book = store.b[ref.id];
    if (!book) return;
    if (source !== undefined && source !== null) { try { worksLearn(book, source, translated); } catch (eW) {} }
    var keys = [];
    for (var k in glossary) keys.push(k);
    for (var i = 0; i < keys.length - GLOSSARY_MAX; i++) delete glossary[keys[i]];
    if (typeof source === "string") { try { nameRingPush(book, glossary, source); } catch (eN) {} }
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
// Danh sách ngắn không phải mục lục (tên truyện, giới thiệu): chấm và giữ tạm, mục lục kế tiếp nhận về.
function introRemember(lines, text) {
    var title = "";
    for (var i = 0; i < lines.length && !title; i++) title = String(lines[i]).trim();
    qtSave(QT3_INTRO, { t: qtNow(), s: genreScores(text), title: title.substring(0, 80) });
}

// Giới thiệu ngắn nhưng nói thẳng thể loại ("武侠：…", "怀揣系统…"): tính gấp đôi, chỉ gắn một lần cho mỗi truyện.
function introAttach(book) {
    if (book.title) return;
    var intro = qtLoad(QT3_INTRO, null, true);
    if (!intro || qtNow() - (intro.t || 0) > INTRO_TTL) return;
    book.title = intro.title || "";
    var total = book.g || {};
    for (var k in (intro.s || {})) total[k] = (total[k] || 0) + 2 * intro.s[k];
    book.g = total;
    qtRemove(QT3_INTRO);
}

// Chốt thể loại khi bằng chứng đủ rõ: nhóm thắng ≥ GENRE_LOCK_MIN điểm và hơn nhóm nhì 1,5 lần (mục lục + giới thiệu
// của 全职艺术家 cho hd 7 = ht 7 — hoà thì chưa chốt, để chương cộng dồn). Cộng dồn tới GENRE_LOCK_SUM_MAX mà vẫn
// chưa rõ thì chốt theo nhóm đang dẫn để văn phong không đổi nữa.
function genreDecide(book, force) {
    if (book.genre) return;
    var t = book.g || {}, sum = 0, top = 0, second = 0;
    var v = [t.co || 0, t.hd || 0, t.nt || 0, t.ht || 0];
    for (var i = 0; i < v.length; i++) { sum += v[i]; if (v[i] > top) { second = top; top = v[i]; } else if (v[i] > second) second = v[i]; }
    if (typeof profileFromScores !== "function") return;
    var clear = top >= GENRE_LOCK_MIN && top >= 1.5 * second;
    if (!clear && sum < GENRE_LOCK_SUM_MAX) return;
    var id = profileFromScores({ co: v[0], hd: v[1], nt: v[2], ht: v[3] });
    if (id) book.genre = id;
}

function capScores(scores, max) {
    var sum = 0;
    for (var k in scores) sum += scores[k];
    if (sum <= max) return scores;
    var out = {};
    for (var k2 in scores) out[k2] = Math.round(scores[k2] * max / sum);
    return out;
}

// Điểm thể loại cộng dồn qua từng chương của cùng truyện: một chương lạc đề không đổi được văn phong của cả bộ,
// và càng đọc thì càng chắc. Không có truyện (chưa gặp mục lục) thì chỉ dùng điểm của chương đang dịch.
// Chỉ cộng vào bản trong bộ nhớ; bookContextPut ở cuối lượt ghi luôn (lượt bị ngắt thì mất điểm của chương đó, chấp nhận).
function genreRemember(ref, scores) {
    if (!ref) return scores;
    var store = booksLoad();
    var book = store.b[ref.id];
    if (!book) return scores;
    if (ref.guessed === true && ref.sure !== true) {
        // Chương đoán truyện chưa chắc: dùng điểm của truyện để chọn văn phong nhưng không cộng vào sổ — đoán sai
        // một lần không được làm truyện đổi giọng. Đoán chắc (bản 22) thì cộng như chương có tên: nguồn không lặp
        // tên chương (metruyencv) trước đây không bao giờ cộng dồn nên văn phong nhảy theo từng chương.
        var view = {};
        for (var g in (book.g || {})) view[g] = book.g[g];
        for (var g2 in scores) view[g2] = (view[g2] || 0) + scores[g2];
        return view;
    }
    if (ref.num === null && ref.guessed !== true) scores = capScores(scores, TOC_SCORE_MAX);
    var total = book.g || {};
    for (var k in scores) total[k] = (total[k] || 0) + scores[k];
    // Giữ điểm ở mức vừa phải để truyện đổi giọng giữa chừng vẫn theo kịp.
    var sum = 0;
    for (var k2 in total) sum += total[k2];
    if (sum > 2000) { for (var k3 in total) total[k3] = Math.round(total[k3] / 2); }
    book.g = total;
    genreDecide(book, ref.num === null && ref.guessed !== true);
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
