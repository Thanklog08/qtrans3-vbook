load('config.js');

function execute(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    var doc = response.html();
    // Tab đầu là 10 chương mới nhất xếp ngược; mục lục đủ nằm ở các tab sau, tăng dần.
    doc.select(".tab-content-1").remove();
    var data = [];
    doc.select(".tab-chap .chapters li a").forEach(function (e) {
        data.push({ name: e.text().trim(), url: fixUrl(e.attr("href")), host: BASE_URL });
    });
    return Response.success(data);
}
