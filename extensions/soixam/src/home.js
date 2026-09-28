load('config.js');

// Bảng xếp hạng Fanqie của Sói Xám (/get_discover?…&is_ranking=1), tên tab tiếng Việt. Kênh Nam/Nữ/Cả hai theo cài đặt.
var RANKS = [
    ["推荐榜", "Đề cử"], ["阅读榜", "Đọc nhiều"], ["巅峰榜", "Đỉnh phong"], ["完本榜", "Hoàn thành"], ["新书榜", "Sách mới"],
    ["黑马榜", "Hắc mã"], ["追更榜", "Theo dõi nhiều"], ["书友榜", "Bạn đọc chọn"], ["礼物榜", "Được tặng quà"]
];

function execute() {
    var channels = CFG_CHANNEL === "Nữ" ? [["0", ""]] : CFG_CHANNEL === "Cả hai" ? [["1", "Nam · "], ["0", "Nữ · "]] : [["1", ""]];
    var tabs = [];
    channels.forEach(function (c) {
        RANKS.forEach(function (r) {
            tabs.push({
                title: c[1] + r[1],
                input: "/get_discover" + qs({ source: "番茄", tab: TAB, bdtype: r[0], gender: c[0], is_ranking: 1 }),
                script: "gen.js"
            });
        });
    });
    return Response.success(tabs);
}
