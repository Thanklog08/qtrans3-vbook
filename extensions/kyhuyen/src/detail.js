load('config.js');

function execute(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    var doc = response.html();
    var info = doc.select(".story-detail .media-body");

    // h1 gồm nhãn nguồn (trong thẻ a) và tên truyện (span con trực tiếp).
    var name = doc.select(".story-detail h1.header-title > span").text().trim();
    var nameOrg = doc.select("h2.inline").text().trim();
    var author = info.select("a[href*=/tac-gia/]").text();
    var status = doc.select(".story-detail .story-stage p").text().replace("(", "").replace(")", "").trim();
    var lastChapter = info.select("p a[href*=/chuong-]").text();
    var lastUpdate = info.select("p:contains(Cập nhật)").text().replace("Cập nhật:", "").trim();
    var views = doc.select(".story-detail span.abbr").first();

    var genres = [];
    info.select("a[href*=cats=]").forEach(function (e) {
        genres.push({ title: e.text(), input: fixUrl(e.attr("href")), script: "gen.js" });
    });

    var detail = [];
    if (nameOrg) detail.push("Tên Hán Việt: " + nameOrg);
    if (author) detail.push("Tác giả: " + author);
    if (status) detail.push("Tình trạng: " + status);
    if (genres.length) detail.push("Thể loại: " + genres.map(function (g) { return g.title; }).join(", "));
    if (lastChapter) detail.push("Chương mới nhất: " + lastChapter);
    if (lastUpdate) detail.push("Cập nhật: " + lastUpdate);
    if (views) detail.push("Lượt xem: " + views.text());

    return Response.success({
        name: name,
        cover: fixUrl(doc.select(".story-detail .media-left img.media-object").attr("src")),
        author: author,
        description: doc.select(".toggle-content .para").html(),
        detail: detail.join("<br>"),
        ongoing: status.indexOf("Đang ra") !== -1,
        genres: genres,
        host: BASE_URL
    });
}
