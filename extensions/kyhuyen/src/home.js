// Trang cũ có /latest, /updates…; kyhuyen.com bỏ các trang đó, danh sách nay là bộ lọc của trang tìm kiếm (o = sắp xếp).
function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "/tim-kiem?o=0", script: "gen.js" },
        { title: "Mới đăng", input: "/tim-kiem?o=1", script: "gen.js" },
        { title: "Đọc nhiều", input: "/tim-kiem?o=2", script: "gen.js" },
        { title: "Yêu thích", input: "/tim-kiem?o=3", script: "gen.js" },
        { title: "Đề cử", input: "/tim-kiem?o=6", script: "gen.js" },
        { title: "Đánh giá cao", input: "/tim-kiem?o=7", script: "gen.js" },
        { title: "Xem nhiều gần đây", input: "/tim-kiem?o=9", script: "gen.js" }
    ]);
}
