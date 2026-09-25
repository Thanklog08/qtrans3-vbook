// Các trang danh sách của site (24 truyện/trang, cùng một kiểu mục).
function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "/moi-cap-nhat", script: "gen.js" },
        { title: "Truyện mới", input: "/truyen-moi", script: "gen.js" },
        { title: "Thịnh hành", input: "/thinh-hanh", script: "gen.js" },
        { title: "Đề cử", input: "/de-cu", script: "gen.js" },
        { title: "Xếp hạng tuần", input: "/bang-xep-hang/tuan", script: "gen.js" },
        { title: "Xếp hạng tháng", input: "/bang-xep-hang/thang", script: "gen.js" },
        { title: "Xếp hạng mọi lúc", input: "/bang-xep-hang/tat-ca", script: "gen.js" },
        { title: "Theo dõi nhiều", input: "/truyen?sort=followers&order=desc", script: "gen.js" },
        { title: "Hoàn thành", input: "/truyen?status=COMPLETED&sort=updatedAt&order=desc", script: "gen.js" }
    ]);
}
