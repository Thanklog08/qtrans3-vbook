load('config.js');

// Bộ lọc thể loại chỉ nhận các thể loại trang /truyen liệt kê (49 mục, 2026-09-25). Tiên hiệp, Đô thị, Xuyên không…
// có trên trang truyện nhưng không lọc được: /truyen?genre=tien-hiep trả danh sách không lọc. Lấy danh sách từ trang
// để tự có thể loại mới nếu site mở rộng.
function execute() {
    var response = fetch(BASE_URL + "/truyen");
    if (!response.ok) return null;
    var doc = response.html();
    var data = [], seen = {};
    doc.select("a[href*='genre=']").forEach(function (a) {
        var m = /[?&]genre=([a-z0-9-]+)/.exec(a.attr("href") + "");
        if (!m || seen[m[1]]) return;
        seen[m[1]] = true;
        data.push({ title: (a.text() + "").trim(), input: "/truyen?genre=" + m[1], script: "gen.js" });
    });
    return Response.success(data);
}
