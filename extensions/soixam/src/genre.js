load('config.js');

// Thể loại Fanqie: nhóm chính (热门标签) tên tiếng Việt viết sẵn; thêm nhóm Chủ đề (主题) và Nhân vật (角色) lấy từ máy chủ
// (/discovestyle), giữ tên gốc để vBook dịch. Mã thể loại (type) và kênh (gender 1 nam, 0 nữ) đo ngày 28/9/2026.
var CATS = {
    "1": [
        [1, "Đô thị"], [7, "Huyền huyễn"], [259, "Kỳ huyễn tiên hiệp"], [517, "Tu tiên"], [12, "Lịch sử"], [10, "Huyền nghi"],
        [751, "Huyền nghi linh dị"], [100, "Linh dị"], [8, "Khoa huyễn mạt thế"], [1183, "Thảm họa"], [19, "Hệ thống"],
        [37, "Xuyên không"], [36, "Trọng sinh"], [23, "Làm ruộng"], [746, "Game · thể thao"], [778, "Hài hước nhẹ nhàng"],
        [538, "Đồng nhân"], [1079, "Diễn sinh"], [39, "Nhị thứ nguyên"], [495, "Tứ hợp viện"], [91, "Nhiều nữ chính"],
        [389, "Một nữ chính"]
    ],
    "0": [
        [3, "Ngôn tình hiện đại"], [5, "Ngôn tình cổ đại"], [32, "Ngôn tình huyễn tưởng"], [96, "Sủng ngọt"], [29, "Tổng tài"],
        [748, "Hào môn tổng tài"], [36, "Trọng sinh"], [37, "Xuyên không"], [24, "Xuyên nhanh"], [79, "Niên đại"], [23, "Làm ruộng"],
        [68, "Mạt thế"], [10, "Huyền nghi"], [1012, "Thuần ái"], [275, "Song nam chính"], [704, "Song nữ chính"], [392, "Không CP"],
        [1063, "Nguyên tác phim"], [778, "Hài hước nhẹ nhàng"], [1079, "Diễn sinh"]
    ]
};
var EXTRA = { "主题": "Chủ đề", "角色": "Nhân vật" };

function execute() {
    var channels = CFG_CHANNEL === "Nữ" ? [["0", ""]] : CFG_CHANNEL === "Cả hai" ? [["1", "Nam · "], ["0", "Nữ · "]] : [["1", ""]];
    var list = [], seen = {};
    var link = function (type, g) {
        return "/get_discover" + qs({ source: "番茄", tab: TAB, type: type, gender: g, genre_type: 0 });
    };
    channels.forEach(function (c) {
        CATS[c[0]].forEach(function (x) {
            seen[c[0] + ":" + x[0]] = true;
            list.push({ title: c[1] + x[1], input: link(x[0], c[0]), script: "gen.js" });
        });
    });
    channels.forEach(function (c) {
        var json = api("GET", "/discovestyle", { source: "番茄", source_type: c[0] === "1" ? "男频" : "女频", tab: TAB });
        var group = null;
        ((json && json.data) || []).forEach(function (m) {
            var title = String(m.title || "");
            if (!m.url) {
                group = null;
                for (var k in EXTRA) if (title.indexOf(k) >= 0) group = EXTRA[k];
                return;
            }
            var t = /[?&]type=(\d+)/.exec(String(m.url));
            var g = /[?&]gender=(\d)/.exec(String(m.url));
            if (!group || !t || (g && g[1] !== c[0]) || seen[c[0] + ":" + t[1]]) return;
            seen[c[0] + ":" + t[1]] = true;
            list.push({ title: c[1] + group + " · " + title, input: link(t[1], c[0]), script: "gen.js" });
        });
    });
    return Response.success(list);
}
