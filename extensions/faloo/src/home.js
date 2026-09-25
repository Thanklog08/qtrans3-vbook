load('config.js');

// Bảng xếp hạng bản wap: y_<nhóm>_<nhánh>_0_0_<loại: 2 完本, 3 VIP>_<sắp xếp: 0 最新, 1 周点击, 3 总点击, 7 周收藏, 9 总收藏>.html
function execute() {
    return Response.success([
        { title: "最新", input: BASE_URL + "/y_0_0_0_0_0_0.html", script: "gen.js" },
        { title: "周点击", input: BASE_URL + "/y_0_0_0_0_0_1.html", script: "gen.js" },
        { title: "总点击", input: BASE_URL + "/y_0_0_0_0_0_3.html", script: "gen.js" },
        { title: "周收藏", input: BASE_URL + "/y_0_0_0_0_0_7.html", script: "gen.js" },
        { title: "完本", input: BASE_URL + "/y_0_0_0_0_2_0.html", script: "gen.js" },
        { title: "同人", input: BASE_URL + "/y_44_0_0_0_0_0.html", script: "gen.js" }
    ]);
}
