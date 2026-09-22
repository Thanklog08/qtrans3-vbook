load("language_list.js"); 
// apikey.js tuỳ chọn: cài qua vBook thì nhập địa chỉ/khoá trong cấu hình tiện ích (cedric_url_ag, api_key_bb).
var apikeyFileStatus = "không có";
try { load("apikey.js"); apikeyFileStatus = "đã nạp"; } catch (e) { apikeyFileStatus = "lỗi: " + e; }
load("prompt.js");
load("cache.js");
load("baidutranslate.js");

var modelsucess = "";
// Q-trans-3: giống Q-trans-2-v2, nhưng mọi lượt gọi model đi qua Cedric Web
// (API chuẩn OpenAI, /v1/chat/completions) thay vì gọi thẳng Gemini.
// cedricBaseUrl và apiKeys (khoá client của Cedric) khai trong apikey.js.
var models = [
    "antigravity-gemini-3.6-flash-high",
    "antigravity-gemini-3-flash",
    "gpt-5.5"
];
// Danh sách cần nhanh (trình đọc/trang truyện trên iPhone bỏ sau ~30 s): 3.1-flash-lite ~10 s cho 8.000 ký tự.
var DEFAULT_LIST_MODEL = "antigravity-gemini-3.1-flash-lite";

// Cedric chèn khối "---\n**Usage:**" (có email tài khoản) vào cuối câu trả lời; không có cờ tắt.
function stripCedricUsage(text) {
    var idx = text.search(/\r?\n-{3}\r?\n\*\*Usage:\*\*/);
    return idx >= 0 ? text.substring(0, idx) : text;
}

// Cấu hình trong trang tiện ích của vBook (plugin.json › config): vBook tiêm mỗi khoá thành hằng toàn cục.
// Đọc qua typeof để chạy được cả khi không có (Node giả lập, bản cũ).
function cfgText(v) {
    if (v === undefined || v === null) return "";
    return String(v).trim().replace(/^"([\s\S]*)"$/, "$1").trim();
}

function configModel() {
    return typeof model_bb !== "undefined" ? cfgText(model_bb) : "";
}

function configPromptProfile() {
    return typeof prompt_profile_h !== "undefined" ? cfgText(prompt_profile_h) : "";
}

// Ô nhập: cho phép gõ "\n" để xuống dòng trong prompt.
function promptText(v) {
    return cfgText(v).replace(/\\n/g, "\n");
}

// "Prompt bổ sung" là danh sách (mode list, vBook lưu JSON array); mỗi mục là một yêu cầu thêm.
function configCustomPrompts() {
    if (typeof custom_prompt_l === "undefined" || custom_prompt_l === null) return [];
    var raw = String(custom_prompt_l).trim();
    if (!raw) return [];
    var arr;
    try { arr = JSON.parse(raw); } catch (e) { arr = [raw]; }
    if (!Array.isArray(arr)) arr = [String(arr)];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        var item = promptText(arr[i]);
        if (item) out.push(item);
    }
    return out;
}

function configCustomPrompt() {
    return configCustomPrompts().join("\n");
}

// Mọi prompt gửi đi đều sửa được ở Settings của tiện ích; ô để trống thì dùng bản trong prompt.js.
// vBook tiêm config thành hằng toàn cục, nên đọc từng tên qua typeof (không dùng this[name]).
function configPromptFor(id) {
    var v = "";
    if (id === "vi" && typeof prompt_vi_bj !== "undefined") v = prompt_vi_bj;
    else if (id === "vi_tieuchuan" && typeof prompt_tieuchuan_d !== "undefined") v = prompt_tieuchuan_d;
    else if (id === "vi_NameEng" && typeof prompt_nameeng_bj !== "undefined") v = prompt_nameeng_bj;
    else if (id === "vi_sac" && typeof prompt_sac_d !== "undefined") v = prompt_sac_d;
    else if (id === "vi_vietlai" && typeof prompt_vietlai_j !== "undefined") v = prompt_vietlai_j;
    else if (id === "vi_layname" && typeof prompt_layname_gb !== "undefined") v = prompt_layname_gb;
    else if (id === "__en" && typeof prompt_english_bl !== "undefined") v = prompt_english_bl;
    else if (id === "en" && typeof prompt_name_english_p !== "undefined") v = prompt_name_english_p;
    else if (id === "zh" && typeof prompt_chinese_9 !== "undefined") v = prompt_chinese_9;
    else if (id === "__list" && typeof prompt_list_bl !== "undefined") v = prompt_list_bl;
    else if (id === "vi_tienhiep" && typeof prompt_tienhiep_ao !== "undefined") v = prompt_tienhiep_ao;
    else if (id === "vi_hiendai" && typeof prompt_hiendai_g !== "undefined") v = prompt_hiendai_g;
    else if (id === "vi_ngontinh" && typeof prompt_ngontinh_bs !== "undefined") v = prompt_ngontinh_bs;
    else if (id === "vi_hethong" && typeof prompt_hethong_ak !== "undefined") v = prompt_hethong_ak;
    else if (id === "vi_convert" && typeof prompt_convert_bh !== "undefined") v = prompt_convert_bh;
    return promptText(v);
}

function promptFor(id) {
    return configPromptFor(id) || prompts[id] || "";
}

function configTextHeader() {
    var v = typeof prompt_text_header_ba !== "undefined" ? promptText(prompt_text_header_ba) : "";
    return v || "Dưới đây là văn bản cần xử lý";
}

function configContextHeader() {
    var v = typeof prompt_context_header_a !== "undefined" ? promptText(prompt_context_header_a) : "";
    return v || "## Ngữ cảnh (chỉ để tham khảo cho nhất quán; KHÔNG dịch lại, KHÔNG đưa vào kết quả):";
}

function configExtraHeader() {
    var v = typeof prompt_extra_header_aj !== "undefined" ? promptText(prompt_extra_header_aj) : "";
    return v || "## Yêu cầu thêm của người đọc (ưu tiên khi mâu thuẫn với phần trên):";
}

function configTemperature() {
    var t = typeof temperature_i !== "undefined" ? parseFloat(cfgText(temperature_i)) : NaN;
    return isNaN(t) ? 1.0 : Math.max(0, Math.min(2, t));
}

function configFlag(v, fallback) {
    var t = cfgText(v).toLowerCase();
    if (t === "true" || t === "1" || t === "on") return true;
    if (t === "false" || t === "0" || t === "off") return false;
    return fallback;
}

function configChunkSize() {
    var n = typeof chunk_size_6 !== "undefined" ? parseInt(cfgText(chunk_size_6), 10) : NaN;
    // Tính theo ký tự gốc. Thời gian mỗi lượt chủ yếu do model: 3-flash ~30–40 s dù đoạn 1.200 hay 2.600 chữ,
    // 3.1-flash-lite ~11 s cho 2.600 chữ. Đoạn 3.000 để model nhanh xong một lượt dưới ngưỡng ~30 s của iPhone.
    if (isNaN(n)) return 3000;
    return Math.max(500, Math.min(20000, n));
}

// ---- Ngữ cảnh giữa các đoạn và giữa các chương ----
// Mỗi đoạn gửi đi kèm: bảng tên riêng (Quick Translator trong vBook, nếu đã nạp từ điển, cộng tên đã gặp trong
// truyện) và phần cuối bản dịch của đoạn/chương ngay trước. Ngữ cảnh lưu THEO TRUYỆN (cache.js): chỉ nối đuôi khi
// chương đang dịch là chương liền sau của cùng truyện; chưa nhận ra truyện thì không gửi đuôi nào.

// ---- Quick Translator của vBook (Qt.translate) ----
// Chạy native, từ điển người dùng đã nạp trong vBook (Name/VietPhrase/PhienAm), ~20–40 ms cho 2.500 chữ.
// Loại segment (đã kiểm trên vBook 1.0, 2026-09-18): 0 khoảng trắng, 1 cụm VietPhrase thường (你=ngươi, 低头=cúi
// đầu), 2 Name (张涛=Trương Đào, 筱筱=Tiêu Tiêu), 3 phiên âm từng chữ, 4 dấu câu, 5 luật/số (第2章=Chương 2).
// Bản ≤ 14 lấy nhầm loại 1 làm tên riêng (iPhone gửi 809 cụm VietPhrase như 他们=Bọn hắn).
var qtLastText = null;
var qtLastResult = null;

function qtRun(text) {
    if (typeof Qt === "undefined") return null;
    if (qtLastText === text) return qtLastResult;
    var result = null;
    try {
        var r = Qt.translate(text, "vp", {});
        if (r && r.translateText) result = { out: String(r.translateText), segments: r.segments || [] };
    } catch (e) {}
    qtLastText = text;
    qtLastResult = result;
    return result;
}

function glossaryFromQt(text, glossary) {
    var r = qtRun(text);
    if (!r) return glossary;
    for (var i = 0; i < r.segments.length; i++) {
        var seg = r.segments[i];
        if (seg.type !== 2 || seg.srcLen < 2) continue;
        var src = text.substr(seg.srcStart, seg.srcLen);
        var dst = r.out.substr(seg.transStart, seg.transLen).trim();
        if (src && dst && !glossary[src]) glossary[src] = dst;
    }
    return glossary;
}

// "QT · Gửi kèm bản convert": AI nhận nguyên văn để dịch nghĩa, cộng bản convert QT của đúng đoạn đó để lấy tên
// riêng/thuật ngữ theo từ điển của người đọc.
function configQtBase() {
    // Mặc định TẮT: thử chương 2.508 chữ với từ điển QT mặc định, 3.1-flash-lite chép theo convert (王桓 "Vương
    // hoàn" thành "Vương Đào", tiêu đề giọng convert); chỉ gửi bảng Name thì đúng. 3.6-flash-high dùng convert ổn nhưng 39 s.
    return configFlag(typeof qt_base_k !== "undefined" ? qt_base_k : "", false);
}

function configQtHeader() {
    var v = typeof prompt_qt_header_c !== "undefined" ? promptText(prompt_qt_header_c) : "";
    return v || "## Bản convert máy của đúng đoạn cần dịch (Quick Translator, từ điển Name/VietPhrase của người đọc). Tên riêng, danh xưng, địa danh, môn phái, chiêu thức, cảnh giới, vật phẩm: viết ĐÚNG như bản convert. Nghĩa và cấu trúc câu: dựa vào nguyên văn; bản convert sai ngữ pháp, không chép câu chữ hay trật tự từ của nó. KHÔNG đưa khối này vào kết quả:";
}

function qtConvertBlock(chunk) {
    var r = qtRun(chunk);
    if (!r || !r.out.trim() || r.out === chunk) return "";
    return "\n\n" + configQtHeader() + "\n\"\"\"\n" + r.out + "\n\"\"\"";
}

function glossaryLine(glossary, text) {
    var parts = [];
    for (var k in glossary) {
        // Chỉ đưa tên có mặt trong đoạn đang dịch để prompt gọn.
        if (text.indexOf(k) > -1) parts.push(k + "=" + glossary[k]);
    }
    return parts.join("; ");
}

function buildContextBlock(glossaryText, previousTail) {
    if (!glossaryText && !previousTail) return "";
    var block = "\n\n" + configContextHeader();
    if (glossaryText) block += "\n- Tên riêng đã dùng, giữ đúng cách dịch: " + glossaryText;
    if (previousTail) block += "\n- Phần cuối của đoạn đã dịch ngay trước:\n\"\"\"\n" + previousTail + "\n\"\"\"";
    return block;
}

// Model chọn trong cài đặt thử trước, sau đó các model dự phòng.
// "Model dự phòng": danh sách tên model (mỗi mục một model); để trống thì dùng danh sách mặc định.
function configFallbackModels() {
    if (typeof fallback_models_bs === "undefined" || fallback_models_bs === null) return models;
    var raw = String(fallback_models_bs).trim();
    if (!raw) return models;
    var arr;
    try { arr = JSON.parse(raw); } catch (e) { arr = raw.split(/[\n,]/); }
    if (!Array.isArray(arr)) arr = [String(arr)];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        var m = cfgText(arr[i]);
        if (m) out.push(m);
    }
    return out.length ? out : models;
}

function modelLoop() {
    var loop = [];
    var chosen = configModel();
    if (chosen) loop.push(chosen);
    var fallback = configFallbackModels();
    for (var i = 0; i < fallback.length; i++) {
        if (loop.indexOf(fallback[i]) === -1) loop.push(fallback[i]);
    }
    return loop;
}

// "Tốc độ · Bộ nhớ đệm": tắt thì xoá hết bộ nhớ của tiện ích ở mỗi lượt và không dùng (cách xoá từ Settings).
function cacheOn() {
    var v = typeof cache_mode_bb !== "undefined" ? cfgText(cache_mode_bb) : "";
    return v.indexOf("tắt") !== 0;
}

function configListModel() {
    var v = typeof list_model_aw !== "undefined" ? cfgText(list_model_aw) : "";
    return v || DEFAULT_LIST_MODEL;
}

// Mọi thứ làm đổi bản dịch: dùng trong khoá cache để đổi cài đặt thì không trả bản cũ.
function settingsFingerprint() {
    return qtHash([configModel(), configListModel(), configPromptProfile(), configCustomPrompt(),
        typeof custom_prompt_replace_4 !== "undefined" ? cfgText(custom_prompt_replace_4) : "",
        configQtBase() ? "qt|" + configQtHeader() : ""].join("|"));
}

// Model đôi khi trả lời 200 nhưng là lời từ chối/tóm tắt ("Tôi không thể cung cấp bản dịch trọn vẹn…").
var REFUSAL_RE = /^[\s*#>"“]*(tôi (không thể|xin lỗi|rất tiếc|không được phép)|xin lỗi|rất tiếc|mình không thể|i (can't|cannot|am unable|won't)|i'm (sorry|unable|not able)|sorry|unfortunately|抱歉|对不起|我无法|我不能)/i;

function looksRefused(out) {
    var head = String(out).substring(0, 400);
    if (REFUSAL_RE.test(head)) return true;
    return /(không thể (cung cấp|dịch)|tóm tắt (nội dung|chương)|can't (provide|translate)|summar(y|ize) instead)/i.test(head) && String(out).length < 1500;
}

function hanRatio(t) {
    var s = String(t), han = 0, n = 0;
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c <= 32) continue;
        n++;
        if (c >= 0x4e00 && c <= 0x9fff) han++;
    }
    return n ? han / n : 0;
}

// vBook tiêm mỗi khoá config của plugin.json thành biến toàn cục; api_key_bb (mode list) là JSON array.
function cedricConfigKeys() {
    var raw = typeof api_key_bb !== "undefined" && api_key_bb ? String(api_key_bb).trim() : "";
    var arr;
    try { arr = JSON.parse(raw); } catch (e) { arr = raw.split(/[\n,]/); }
    if (!Array.isArray(arr)) arr = [String(arr)];
    var keys = [];
    for (var i = 0; i < arr.length; i++) {
        var k = String(arr[i]).trim().replace(/^"|"$/g, "").trim();
        if (k) keys.push(k);
    }
    if (keys.length > 0) return keys;
    return typeof apiKeys !== "undefined" && apiKeys ? apiKeys.filter(function(k) { return k && String(k).trim(); }) : [];
}

function cedricChatUrl() {
    var configured = typeof cedric_url_ag !== "undefined" ? cfgText(cedric_url_ag) : "";
    if (!configured && typeof cedricBaseUrl === "string") configured = cedricBaseUrl;
    var base = String(configured).trim().replace(/\/+$/, "");
    if (base.slice(-3) === "/v1") base = base.slice(0, -3);
    return base ? base + "/v1/chat/completions" : "";
}

function callGeminiAPI(text, prompt, apiKey, model) {
    if (!apiKey) { return { status: "error", message: "API Key không hợp lệ." }; }
    if (!text || text.trim() === '') { return { status: "success", data: "" }; }
    var url = cedricChatUrl();
    if (!url) { return { status: "error", message: "Chưa khai địa chỉ Cedric (cấu hình cedric_url_ag hoặc cedricBaseUrl trong apikey.js)." }; }
    modelsucess = model;
    var full_prompt = prompt + "\n\n" + configTextHeader() + "\n\n" + text;
    var body = {
        "model": model,
        "messages": [{ "role": "user", "content": full_prompt }],
        "temperature": configTemperature(),
        "top_p": 1.0,
        "max_tokens": 65536,
        "stream": false
    };
    try {
        var response = fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey }, body: JSON.stringify(body) });
        var responseText = response.text() || "";

        if (response.ok) {
            var result = JSON.parse(responseText);
            var choice = result.choices && result.choices.length > 0 ? result.choices[0] : null;
            var content = choice && choice.message && typeof choice.message.content === "string" ? stripCedricUsage(choice.message.content).trim() : "";
            if (content) {
                return { status: "success", data: content };
            }
            if (choice && choice.finish_reason === "content_filter") { return { status: "blocked", message: "Bị chặn bởi bộ lọc nội dung (content_filter)." }; }
            if (choice) { return { status: "blocked", message: "Bị chặn hoặc không có nội dung trả về (finish_reason: " + choice.finish_reason + ")." }; }
            return { status: "error", message: "API không trả về nội dung hợp lệ. Phản hồi: " + stripCedricUsage(responseText) };
        } else {
            var status = (response.status === 401 || response.status === 403) ? "key_error" : "error";
            if (!responseText.trim()) {
                // vBook trả 504 không có thân khi không kết nối được tới máy chủ.
                return { status: status, message: "Lỗi HTTP " + response.status + ": không có phản hồi từ " + url + " (kiểm địa chỉ Cedric, Cedric có đang chạy, adb reverse)." };
            }
            return { status: status, message: "Lỗi HTTP " + response.status + ". Phản hồi từ server:\n" + responseText };
        }
    } catch (e) { return { status: "error", message: "Ngoại lệ Javascript: " + e.toString() }; }
}

// minRatio: bản dịch ngắn hơn tỉ lệ này so với đoạn gửi đi thì coi là bị cắt. Tuyến phiên âm gửi chuỗi âm
// Hán-Việt dài hơn nhiều so với câu viết lại, nên dùng ngưỡng thấp hơn (v2 dùng 0.8 cho mọi tuyến).
function translateChunkWithApiRetry(chunkText, prompt, modelToUse, keysToTry, minRatio) {
    minRatio = minRatio || 0.8;
    var keyErrors = [];
    for (var i = 0; i < keysToTry.length; i++) {
        var apiKeyToUse = keysToTry[i];
        var result = callGeminiAPI(chunkText, prompt, apiKeyToUse, modelToUse);
        
        if (result.status === "success" && looksRefused(result.data)) {
            result.status = "refused";
            result.message = "Model từ chối/tóm tắt thay vì dịch: " + result.data.substring(0, 120);
        } else if (result.status === "success" && hanRatio(chunkText) > 0.3 && hanRatio(result.data) > 0.15 && minRatio >= 0.5) {
            result.status = "untranslated";
            result.message = "Bản trả về còn nhiều chữ Hán (" + Math.round(hanRatio(result.data) * 100) + "%).";
        } else if (result.status === "success") {
            if ((result.data.length / chunkText.length) < minRatio) {
                result.status = "short_result_error";
                result.message = "Kết quả trả về ngắn hơn " + Math.round(minRatio * 100) + "% so với văn bản gửi đi.";
            } else {
                return result; 
            }
        }
        
        keyErrors.push("  + Key " + (i + 1) + " (" + apiKeyToUse.substring(0, 4) + "...):\n    " + result.message.replace(/\n/g, '\n    '));

        if (i < keysToTry.length - 1) {
            try { sleep(100); } catch (e) {}
        }
    }
    return { 
        status: 'all_keys_failed', 
        message: 'Tất cả API keys đều thất bại cho chunk này.',
        details: keyErrors 
    }; 
}

// Chẩn đoán: vBook chỉ hiện "Dịch không thành công", không hiện lý do. Lượt gọi gần nhất (tham số, lỗi;
// không có khoá) được ghi vào localStorage "qtrans3_last_call", xem ở Extensions › Q-trans 3 › Local storage.
var lastErrorMessage = "";
var lastTranslation = null;
var lastBookInfo = null;

// Bản cache từ phiên bản trước còn tiền tố "<model> . ".
function stripModelPrefix(text) {
    return String(text).replace(/^(antigravity-|gemini-|deepseek)[A-Za-z0-9.\-]* \. /, "");
}

function fail(message) {
    lastErrorMessage = String(message);
    return Response.error(message);
}

// vBook truyền mã chuẩn ("auto", "zh-Hans", "zh-Hant", "en", "vi"...), v2 viết cho "zh"/"en"/"vi".
function normalizeLanguage(code, fallback) {
    var c = String(code === undefined || code === null ? "" : code).trim();
    var lower = c.toLowerCase();
    if (!lower || lower === "auto") return fallback;
    if (lower === "zh" || lower.indexOf("zh-") === 0 || lower.indexOf("zh_") === 0 || lower === "cn") return "zh";
    if (lower.indexOf("en") === 0 && lower.length <= 5) return "en";
    if (lower.indexOf("vi") === 0 && lower.length <= 5) return "vi";
    return c;
}

// Dịch sang tiếng Anh: prompt "en" của v2 là prompt chuyển tên, không dùng để dịch đoạn văn.
prompts["__en"] = "You are a professional literary translator. Translate the text below into natural, fluent English that reads like a published novel. Keep every paragraph and line break, keep names consistent, and output ONLY the translation: no preface, notes, alternatives or markdown.";

// ---- Dịch danh sách (Khám phá, trang truyện, mục lục, tên chương) ----
// vBook ghép kết quả theo dòng: bản dịch phải đúng số dòng. Model hay thêm lời giải thích với đoạn ngắn, nên mỗi
// dòng được đánh số "N|…", model trả "N|bản dịch", tiện ích ghép lại theo số; dòng thiếu giữ nguyên văn.
prompts["__list"] = "Bạn là dịch giả tiểu thuyết mạng Trung Quốc. Dịch từng dòng bên dưới sang {LANG}: tên truyện, tên chương, thể loại, tác giả, giới thiệu. Tên riêng viết theo Hán-Việt, viết hoa mỗi chữ; tên chương dạng \"Chương N: …\".\n\n## Định dạng BẮT BUỘC:\n- Mỗi dòng vào có dạng \"số|nội dung\". Trả về đúng từng dòng dạng \"số|bản dịch\", giữ nguyên số, không gộp, không bỏ dòng.\n- CHỈ trả các dòng đó. Không lời mở đầu, không giải thích, không markdown.";
var LIST_LINES_PER_CALL = 60;
var listCacheInfo = null;

function listLanguageName(to) {
    if (to === "__en" || to === "en") return "tiếng Anh";
    if (to === "zh") return "tiếng Trung giản thể";
    return "tiếng Việt";
}

function parseNumberedLines(output) {
    var map = {};
    var lines = String(output).split("\n");
    for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/^\s*(\d+)\s*[|｜]\s?(.*)$/);
        if (m) map[parseInt(m[1], 10)] = m[2].trim();
    }
    return map;
}

function translateList(text, to, keys) {
    var lines = text.split("\n");
    var result = lines.slice();
    var indexes = [];
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].trim()) indexes.push(i);
    }
    if (indexes.length === 0) return Response.success(text);

    // Mục lục: ghi tên chương → truyện, để dịch chương biết đang ở truyện nào (ngữ cảnh không lẫn truyện).
    // Tên chương cũng là tín hiệu thể loại rẻ nhất: một chương lẻ thường chưa đủ điểm, nhưng cả mục lục thì đủ,
    // nên chương đầu tiên người đọc mở đã có văn phong đúng.
    if (looksLikeToc(lines)) {
        try {
            var tocBook = registerToc(lines);
            if (tocBook) genreRemember({ id: tocBook, num: null }, genreScores(text));
        } catch (eReg) {}
    }

    // Dòng đã dịch rồi (mở lại truyện, vBook gửi lại mục lục) lấy từ bộ nhớ; chỉ gửi dòng mới.
    var useCache = cacheOn();
    var store = useCache ? linesLoad() : null;
    var lineSalt = to + "|" + qtHash(configCustomPrompt() + "|" + promptFor("__list")) + "|";
    var pending = [];
    for (var p = 0; p < indexes.length; p++) {
        var hit = useCache ? linesGet(store, qtHash(lineSalt + lines[indexes[p]].trim())) : null;
        if (hit !== null) result[indexes[p]] = hit;
        else pending.push(indexes[p]);
    }
    listCacheInfo = { cached: indexes.length - pending.length, sent: pending.length };
    indexes = pending;
    if (indexes.length === 0) return Response.success(result.join("\n"));

    var basePrompt = promptFor("__list").replace("{LANG}", listLanguageName(to));
    var extras = configCustomPrompts();
    if (extras.length) basePrompt += "\n\n" + configExtraHeader() + "\n- " + extras.join("\n- ");
    // Danh sách dùng model nhanh riêng, rồi mới đến model chương và dự phòng.
    var loop = [configListModel()];
    var chapterLoop = modelLoop();
    for (var ml = 0; ml < chapterLoop.length; ml++) { if (loop.indexOf(chapterLoop[ml]) === -1) loop.push(chapterLoop[ml]); }

    for (var start = 0; start < indexes.length; start += LIST_LINES_PER_CALL) {
        var batch = indexes.slice(start, start + LIST_LINES_PER_CALL);
        var numbered = [];
        for (var b = 0; b < batch.length; b++) numbered.push((b + 1) + "|" + lines[batch[b]]);
        var map = null;
        var errors = [];
        for (var m = 0; m < loop.length && !map; m++) {
            // Danh sách ngắn: không áp ngưỡng độ dài (tên dịch có thể ngắn hơn chuỗi đánh số).
            var r = translateChunkWithApiRetry(numbered.join("\n"), basePrompt, loop[m], keys, 0.01);
            if (r.status === "success") {
                var parsed = parseNumberedLines(r.data);
                var got = 0;
                for (var k in parsed) got++;
                // Ít nhất một nửa số dòng khớp số thì nhận; còn lại giữ nguyên văn.
                if (got >= Math.ceil(batch.length / 2)) map = parsed;
                else errors.push(loop[m] + ": trả " + got + "/" + batch.length + " dòng đánh số");
            } else {
                errors.push(loop[m] + ": " + (r.details ? r.details.join(" ") : r.message));
            }
        }
        if (!map) return fail("Dịch danh sách lỗi: " + errors.join(" | "));
        var fresh = [];
        for (var j = 0; j < batch.length; j++) {
            var translated = map[j + 1];
            if (translated) {
                result[batch[j]] = translated;
                fresh.push([qtHash(lineSalt + lines[batch[j]].trim()), translated]);
            }
        }
        // Lưu ngay sau mỗi lượt: vBook hết giờ chờ giữa chừng thì lần sau không gửi lại phần đã xong.
        if (useCache && fresh.length) { store = linesLoad(); linesPutMany(store, fresh); }
        logStep("danh sách " + Math.min(start + LIST_LINES_PER_CALL, indexes.length) + "/" + indexes.length + " dòng xong");
    }
    return Response.success(result.join("\n"));
}

function execute(text, from, to, extra) {
    var info = {
        time: new Date().toISOString(),
        from: String(from),
        to: String(to),
        extra: String(extra === undefined ? "" : extra),
        length: text ? String(text).length : 0,
        keys: cedricConfigKeys().length,
        apikeyFile: apikeyFileStatus,
        apiKeyConfig: typeof api_key_bb === "undefined" ? "không có" : (typeof api_key_bb) + ", dài " + String(api_key_bb).length,
        url: cedricChatUrl()
    };
    lastErrorMessage = "";
    lastTranslation = null;
    lastBookInfo = null;
    listCacheInfo = null;
    // Ghi ngay lúc bắt đầu: phân biệt "vBook không gọi" với "tiện ích treo giữa chừng".
    try { localStorage.setItem("qtrans3_last_start", JSON.stringify({ time: info.time, from: info.from, to: info.to, extra: info.extra, length: info.length })); } catch (e0) {}
    try { logStart(info.extra, info.length); } catch (e1) {}
    try {
        var normalizedFrom = normalizeLanguage(from, "zh");
        var normalizedTo = normalizeLanguage(to, "vi");
        if (normalizedTo === "en") normalizedTo = "__en";
        info.normalized = normalizedFrom + "->" + normalizedTo;
        var source = String(extra === undefined || extra === null ? "" : extra);
        var plainText = text === undefined || text === null ? "" : String(text);
        purgeLegacyStorage();
        if (!cacheOn()) purgeAllCaches();
        var isChapter = source === "chapterContent" || normalizedTo === "vi_xoacache";
        // vBook gọi lại cùng nội dung khi hết giờ chờ, khi mở lại, hoặc song song: trả bản vừa dịch / chờ lượt
        // đang chạy thay vì gọi API lần nữa. Danh sách đã có cache theo dòng nên chỉ áp cho chương.
        var reqKey = null;
        if (isChapter && cacheOn() && normalizedTo !== "vi_xoacache" && plainText.trim()) {
            reqKey = qtHash(normalizedFrom + "|" + normalizedTo + "|" + settingsFingerprint() + "|" + plainText);
            var done = recentGet(reqKey) || waitForSameRequest(reqKey);
            if (done !== null) { info.mode = "chapter"; info.cache = "recent"; logStep("xong (bản vừa dịch)"); return Response.success(done); }
            inflightSet(reqKey, true);
        }
        // Chỉ nội dung chương đi đường dịch chương; Khám phá, trang truyện, mục lục, kể cả lượt không gắn loại,
        // đi đường danh sách đánh số (vBook gọi trang Khám phá với extra rỗng).
        if (source !== "chapterContent" && normalizedTo !== "vi_xoacache") {
            info.mode = "list";
            var listKeys = cedricConfigKeys();
            if (listKeys.length === 0) return fail("LỖI: Vui lòng cấu hình ít nhất 1 API key.");
            var listKey = cacheOn() && plainText.trim() ? qtHash("list|" + normalizedTo + "|" + plainText) : null;
            if (listKey) { waitForSameList(listKey); inflightSet(listKey, true); }
            var listResult;
            try {
                listResult = translateList(plainText, normalizedTo, listKeys);
            } finally {
                if (listKey) inflightSet(listKey, false);
            }
            if (listCacheInfo) info.cache = listCacheInfo;
            info.error = lastErrorMessage.substring(0, 600);
            info.model = modelsucess;
            return listResult;
        }
        info.mode = "chapter";
        try {
            var result = translateText(plainText, normalizedFrom, normalizedTo);
            if (reqKey && lastTranslation !== null) recentPut(reqKey, lastTranslation);
        } finally {
            if (reqKey) inflightSet(reqKey, false);
        }
        info.error = lastErrorMessage.substring(0, 600);
        info.model = modelsucess;
        if (lastBookInfo) info.book = lastBookInfo;
        if (lastGenre) info.genre = lastGenre;
        return result;
    } catch (e) {
        info.exception = String(e);
        lastErrorMessage = "Ngoại lệ: " + e;
        return fail("Q-trans 3 lỗi: " + e);
    } finally {
        try { localStorage.setItem("qtrans3_last_call", JSON.stringify(info)); } catch (e2) {}
        try { logStep(info.error ? "lỗi: " + info.error : (info.exception ? "ngoại lệ: " + info.exception : "xong" + (info.model ? " (" + info.model + ")" : ""))); } catch (e3) {}
    }
}

// ---- nhận thể loại để chọn văn phong (Văn phong = auto) ----
// Từ khoá lấy từ VietPhrase của Q-trans 1 và đối chiếu bằng máy (2026-09-22), không gõ theo trí nhớ; mục nào
// không có trong từ điển đã bỏ. Trọng số: chữ chỉ đúng một thể loại nặng hơn chữ dùng chung.
var GENRE_WORDS = {
    co: [["修炼",2],["灵气",2],["金丹",2],["筑基",2],["真气",2],["师尊",2],["师兄",2],["师妹",2],["宗门",2],
         ["门派",2],["法宝",2],["丹药",2],["灵石",2],["修士",2],["武者",2],["内力",2],["剑法",2],["仙人",2],
         ["天劫",2],["江湖",1],["客栈",1],["王爷",1],["朝廷",1],["公子",1],["姑娘",1],["长老",1]],
    hd: [["手机",2],["电脑",2],["微博",2],["地铁",2],["短信",2],["直播",2],["网友",2],["粉丝",2],["视频",2],
         ["超市",2],["办公室",2],["小区",2],["公司",1],["老板",1],["经理",1],["汽车",1],["咖啡",1],["警察",1],
         ["医院",1],["大学",1],["电话",1],["飞机",1],["照片",1],["节目",1],["网络",1],["同事",1],["毕业",1]],
    nt: [["男朋友",2],["女朋友",2],["亲吻",2],["拥抱",2],["心动",2],["暗恋",2],["撒娇",2],["脸红",2],["恋爱",2],
         ["情侣",2],["怀孕",2],["初恋",2],["表白",2],["约会",2],["婚礼",2],["结婚",1],["老公",1],["老婆",1]],
    ht: [["宿主",3],["经验值",3],["副本",3],["面板",3],["系统",2],["属性",2],["商城",2],["签到",2],["任务",1],
         ["奖励",1],["积分",1],["技能",1],["恭喜",1],["解锁",1]]
};
var GENRE_PROFILE = { co: "vi_tienhiep", hd: "vi_hiendai", nt: "vi_ngontinh", ht: "vi_hethong" };
var WORD_HITS_MAX = 5;

function genreScores(text) {
    var s = String(text);
    var out = { co: 0, hd: 0, nt: 0, ht: 0 };
    for (var g in GENRE_WORDS) {
        var list = GENRE_WORDS[g];
        for (var i = 0; i < list.length; i++) {
            var w = list[i][0], hits = 0, at = s.indexOf(w);
            while (at > -1 && hits < WORD_HITS_MAX) { hits++; at = s.indexOf(w, at + w.length); }
            out[g] += hits * list[i][1];
        }
    }
    return out;
}

// Hệ thống chồng lên thể loại khác (xuyên nhanh trong bối cảnh cổ trang vẫn là truyện hệ thống) nên xét trước.
// Điểm quá thấp thì trả "" để dùng prompt "vi" chung, không đoán bừa.
function profileFromScores(t) {
    if (t.ht >= 6 && t.ht >= t.co && t.ht >= t.hd) return GENRE_PROFILE.ht;
    var base = t.co >= t.hd ? "co" : "hd";
    if (t.nt >= 6 && t.nt >= t[base]) return GENRE_PROFILE.nt;
    if (t[base] < 4) return "";
    return GENRE_PROFILE[base];
}

// Văn phong tự động: điểm của chương đang dịch cộng dồn vào điểm của truyện (nhận qua mục lục).
function autoProfile(text, ref) {
    var totals = genreRemember(ref, genreScores(text));
    var id = profileFromScores(totals);
    lastGenre = { co: totals.co, hd: totals.hd, nt: totals.nt, ht: totals.ht, chon: id || "vi" };
    return id && promptFor(id) ? id : "";
}

var lastGenre = null;

function translateText(text, from, to) {
    if (!text || text.trim() === '') {
        return Response.success("?");
    }

    // "Văn phong mặc định" trong cài đặt thay cho đích "vi" trơn (vBook thường gọi zh → vi).
    // "auto" (mặc định) tự nhận thể loại từ chính chữ Hán của chương: tủ sách nhiều thể loại thì không phải
    // vào Settings đổi tay mỗi lần chuyển truyện.
    lastGenre = null;
    var profileOverride = configPromptProfile();
    if (to === "vi" && (!profileOverride || profileOverride === "auto")) {
        var picked = autoProfile(text, findBookForChapter(text));
        if (picked) to = picked;
    } else if (to === "vi" && profileOverride !== "vi" && promptFor(profileOverride)) {
        to = profileOverride;
    }

    var apiKeyStorageKey = "vbook_last_api_key_index";
    var apiKeys = cedricConfigKeys();
    var rotatedApiKeys = apiKeys; 
    try {
        if (apiKeys && apiKeys.length > 1) {
            var lastUsedIndex = parseInt(localStorage.getItem(apiKeyStorageKey) || "-1");
            var nextIndex = (lastUsedIndex + 1) % apiKeys.length;
            rotatedApiKeys = apiKeys.slice(nextIndex).concat(apiKeys.slice(0, nextIndex));
            localStorage.setItem(apiKeyStorageKey, nextIndex.toString());
        }
    } catch (e) {
        rotatedApiKeys = apiKeys;
    }

    var lines = text.split('\n');

    if (to === 'vi_xoacache') {
        // Đích "xoá cache" của Q-trans-2: xoá toàn bộ bộ nhớ của tiện ích.
        purgeAllCaches();
        return Response.success(text);
    }

    var isShortTextOrList = false;
    var lengthThreshold = 1000;   
    var lineLengthThreshold = 25; 
    if (to === 'vi_vietlai') {
        lengthThreshold = 1500;
        lineLengthThreshold = 50;
    }
    if (text.length < lengthThreshold) {
        isShortTextOrList = true;
    } else {
        var shortLinesCount = 0;
        var totalLines = lines.length;
        if (totalLines > 0) {
            for (var i = 0; i < totalLines; i++) {
                if (lines[i].length < lineLengthThreshold) { shortLinesCount++; }
            }
            if ((shortLinesCount / totalLines) > 0.8) {
                isShortTextOrList = true;
            }
        }
    }
    // Từ bản 10 chỉ nội dung chương vào đây (danh sách đi translateList). Ngưỡng độ dài / dòng ngắn của v2 (dành
    // cho Baidu) làm chương nhiều thoại bị coi là danh sách và mất ngữ cảnh, nên chỉ đoạn rất ngắn mới tính.
    isShortTextOrList = text.length < 200;
    if (to === 'vi_vietlai' && isShortTextOrList) {
        return Response.success(text);
    }

    var finalContent = "";
    // Baidu công khai đã bị khoá (errno 995, xem docs/quick-translate-reference.md): đoạn ngắn cũng đi Cedric.
    var useGeminiForShortText = true;
    
    if (isShortTextOrList) {
        var basicLangs = ['zh', 'en', 'vi'];
        if (basicLangs.indexOf(from) > -1 && basicLangs.indexOf(to) > -1) {
            useGeminiForShortText = true;
        }
    }

    if (isShortTextOrList && !useGeminiForShortText) {
        const BAIDU_CHUNK_SIZE = 500;
        var baiduTranslatedParts = [];
        var basicBaiduLangs = ['vi', 'zh', 'en'];
        var baiduToLang = basicBaiduLangs.indexOf(to) > -1 ? to : 'vi';

        for (var i = 0; i < lines.length; i += BAIDU_CHUNK_SIZE) {
            var currentChunkLines = lines.slice(i, i + BAIDU_CHUNK_SIZE);
            var chunkText = currentChunkLines.join('\n');
            var translatedChunk = baiduTranslateContent(chunkText, 'auto', baiduToLang, 0); 
            if (translatedChunk === null) {
                return fail("Lỗi Baidu Translate. Vui lòng thử lại.");
            }
            baiduTranslatedParts.push(translatedChunk);
        }
        finalContent = baiduTranslatedParts.join('\n');
    } else {
        if (!rotatedApiKeys || rotatedApiKeys.length === 0) { return fail("LỖI: Vui lòng cấu hình ít nhất 1 API key."); }
        
        var modelToUse = null;
        var useModelLoop = true;
        var finalTo = to; 
        var isPinyinRoute = false; 
        // Q-trans-2 cho chọn model ở ô ngôn ngữ nguồn; giữ tương thích khi from là tên model của Cedric.
        var validModels = (String(from).indexOf("antigravity-") === 0 || String(from).indexOf("deepseek") === 0) ? [from] : [];
        var pinyinLangs = ['vi_tieuchuan', 'vi_sac', 'vi_NameEng', 'vi_layname'];

        if (validModels.indexOf(from) > -1) {
            modelToUse = from;
            useModelLoop = false;
            if (pinyinLangs.indexOf(to) > -1) {
                isPinyinRoute = true;
            }
        } else if (from === 'en' || from === 'vi') {
            var validTargets = ['zh', 'vi', 'en'];
            if (validTargets.indexOf(finalTo) === -1) {
                finalTo = 'vi';
            }
            isPinyinRoute = false; 
        } else {
            if (pinyinLangs.indexOf(to) > -1) {
                isPinyinRoute = true;
            }
        }

        var selectedPrompt = promptFor(finalTo) || promptFor("vi");
        // Prompt tuỳ chỉnh: mặc định NỐI THÊM vào prompt của văn phong (yêu cầu riêng của người đọc);
        // bật "Prompt tuỳ chỉnh thay hẳn prompt gốc" thì thay. Không đụng "Lấy Name" và chuyển tên tiếng Anh.
        var customPrompt = configCustomPrompt();
        if (customPrompt && finalTo !== 'vi_layname' && finalTo !== 'en') {
            var replacePrompt = configFlag(typeof custom_prompt_replace_4 !== "undefined" ? custom_prompt_replace_4 : "", false);
            selectedPrompt = replacePrompt ? customPrompt : selectedPrompt + "\n\n" + configExtraHeader() + "\n- " + configCustomPrompts().join("\n- ");
        }

        var useContext = configFlag(typeof use_context_ae !== "undefined" ? use_context_ae : "", true) && !isShortTextOrList;
        var useQtNames = configFlag(typeof use_qt_names_4 !== "undefined" ? use_qt_names_4 : "", true);
        // Ngữ cảnh theo truyện: nhận truyện qua tên chương (dòng đầu) trong các mục lục đã gặp.
        var bookRef = useContext ? findBookForChapter(text) : null;
        var context = bookContextGet(bookRef);
        lastBookInfo = bookRef ? { id: bookRef.id, chapter: bookRef.num, previousTail: context.tailUsed } : "chưa nhận ra truyện";
        if (useQtNames && !isShortTextOrList) glossaryFromQt(text, context.glossary);
        
        var pinyinLangs = ['vi_tieuchuan', 'vi_sac', 'vi_NameEng', 'vi_layname'];
        var isPinyinRoute = (validModels.indexOf(from) > -1 || from === 'zh') && pinyinLangs.indexOf(to) > -1;

        var translationSuccessful = false;
        var errorLog = {};
        var modelsToIterate = useModelLoop ? modelLoop() : [modelToUse];

        for (var m = 0; m < modelsToIterate.length; m++) {
            var currentModel = modelsToIterate[m];
            // v2 chia 1500–4000 ký tự vì gọi Gemini công khai; qua Cedric các model đều nhận chương dài, và
            // càng ít đoạn thì càng giữ được ngữ cảnh. Mặc định 6000 (đa số chương đi một lượt), đổi ở cài đặt.
            var CHUNK_SIZE = configChunkSize();
            var MIN_LAST_CHUNK_SIZE = Math.min(1000, Math.floor(CHUNK_SIZE / 4));

            var textChunks = [];
            var currentChunk = "";
            var currentChunkLineCount = 0;
            const MAX_LINES_PER_CHUNK = 200;
            for (var i = 0; i < lines.length; i++) {
                var paragraph = lines[i];
                if (currentChunk.length === 0 && paragraph.length >= CHUNK_SIZE) {
                    textChunks.push(paragraph);
                    continue;
                }
                if ((currentChunk.length + paragraph.length + 1 > CHUNK_SIZE || currentChunkLineCount >= MAX_LINES_PER_CHUNK) && currentChunk.length > 0 ) {
                    textChunks.push(currentChunk);
                    currentChunk = paragraph;
                    currentChunkLineCount = 1;
                } else {
                    currentChunk = currentChunk ? (currentChunk + "\n" + paragraph) : paragraph;
                    currentChunkLineCount++;
                }
            }
            if (currentChunk.length > 0) textChunks.push(currentChunk);
            if (textChunks.length > 1 && textChunks[textChunks.length - 1].length < MIN_LAST_CHUNK_SIZE) {
                var lastChunk = textChunks.pop();
                var secondLastChunk = textChunks.pop();
                textChunks.push(secondLastChunk + "\n" + lastChunk);
            }

            var finalParts = [];
            var currentModelFailed = false;
            for (var k = 0; k < textChunks.length; k++) {
                var chunkToSend = textChunks[k];
                if (isPinyinRoute && !isShortTextOrList) { 
                    try {
                        load("phienam.js");
                        chunkToSend = phienAmToHanViet(chunkToSend);
                    } catch (e) { return fail("LỖI: Không thể tải file phienam.js."); }
                }
                
                // Đoạn đã dịch ở lượt trước (bị ngắt giữa chừng) thì dùng lại, không gọi API.
                var chunkKey = cacheOn() ? qtHash(finalTo + "|" + isPinyinRoute + "|" + settingsFingerprint() + "|" + textChunks[k]) : null;
                var savedChunk = chunkKey ? chunkGet(chunkKey) : null;
                if (savedChunk !== null) {
                    finalParts.push(savedChunk);
                    logStep("đoạn " + (k + 1) + "/" + textChunks.length + " có sẵn");
                    continue;
                }
                var previousTail = k > 0 ? String(finalParts[k - 1]).slice(-CONTEXT_TAIL_CHARS) : (useContext ? context.tail : "");
                var promptForChunk = selectedPrompt + (useContext ? buildContextBlock(glossaryLine(context.glossary, textChunks[k]), previousTail) : "");
                // Tuyến phiên âm tự đổi sang Hán-Việt rồi mới gửi, không cần bản convert.
                if (configQtBase() && !isPinyinRoute && from === "zh") promptForChunk += qtConvertBlock(textChunks[k]);
                logStep("đang gọi " + currentModel + ", đoạn " + (k + 1) + "/" + textChunks.length);
                var chunkResult = translateChunkWithApiRetry(chunkToSend, promptForChunk, currentModel, rotatedApiKeys, (isPinyinRoute && !isShortTextOrList) ? 0.5 : 0.8);
                
                if (chunkResult.status === 'success') {
                    finalParts.push(chunkResult.data);
                    if (chunkKey) chunkPut(chunkKey, chunkResult.data);
                    logStep("đoạn " + (k + 1) + "/" + textChunks.length + " xong");
                } else {
                    errorLog[currentModel] = chunkResult.details;
                    currentModelFailed = true;
                    break; 
                }
            }

            if (!currentModelFailed) {
                // v2 dán "<model> . " vào đầu bản dịch; trong trình đọc nó lọt vào tiêu đề chương.
                // Tên model xem ở mục chẩn đoán qtrans3_last_call.
                finalContent = finalParts.join('\n\n');
                translationSuccessful = true;
                if (useContext) bookContextPut(bookRef, finalContent, context.glossary);
                break; 
            }
        } 

        if (!translationSuccessful && useModelLoop && !isPinyinRoute) {
            var minimal = "Dịch văn bản dưới đây sang tiếng Việt tự nhiên, đầy đủ từng câu, giữ nguyên xuống dòng. Chỉ trả bản dịch.";
            var lastTry = translateChunkWithApiRetry(text, minimal, modelsToIterate[0], rotatedApiKeys, 0.8);
            if (lastTry.status === "success") {
                finalContent = lastTry.data;
                translationSuccessful = true;
                if (useContext) bookContextPut(bookRef, finalContent, context.glossary);
            } else {
                errorLog[modelsToIterate[0] + " (prompt tối giản)"] = lastTry.details;
            }
        }

        if (!translationSuccessful) {
            var errorString = "<<<<<--- LỖI DỊCH (ĐÃ THỬ HẾT CÁC MODEL) --->>>>>\n";
            for (var modelName in errorLog) {
                errorString += "\n--- Chi tiết lỗi với Model: " + modelName + " ---\n";
                if(errorLog[modelName]) errorString += errorLog[modelName].join("\n");
                errorString += "\n";
            }
            errorString += "\n<<<<<--- KẾT THÚC BÁO CÁO LỖI --->>>>>";
            return fail(errorString);
        }
    }

    lastTranslation = finalContent.trim();
    return Response.success(finalContent.trim());
}