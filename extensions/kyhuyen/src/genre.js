// Trang chủ mới không còn khối "Thể loại"; danh sách lấy từ bộ lọc cats= của trang tìm kiếm (2026-09-24).
function execute() {
    var cats = [
        [1, "Kỳ huyễn"], [2, "Võng du"], [3, "Linh dị"], [4, "Huyền huyễn"], [5, "Khoa huyễn"], [6, "Đô thị"],
        [7, "Tiên hiệp"], [8, "Võ hiệp"], [9, "Lịch sử"], [10, "Quân sự"], [11, "Đồng nhân"], [12, "Cạnh kỹ"],
        [13, "Mạt thế"], [14, "Trinh thám"], [15, "Cổ đại"], [16, "Tây huyễn"]
    ];
    return Response.success(cats.map(function (c) {
        return { title: c[1], input: "/tim-kiem?cats=" + c[0], script: "gen.js" };
    }));
}
